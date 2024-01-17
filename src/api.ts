import axios from 'axios';
import { Logger } from 'homebridge';
import ReconnectingWebSocket from 'reconnecting-websocket';
import WebSocket from 'ws';

const baseURL = 'https://my.leviton.com/api';

type HomeAwayStatus = 'HOME' | 'AWAY';

interface ResidenceInfo {
  name: string;
  id: number;
  status: HomeAwayStatus;
}

export class LevitonResidence {
  private readonly token: string;
  private readonly loginData: object;
  private readonly log: Logger;
  private homeAwayStatus_: HomeAwayStatus;

  readonly residenceID: number;

  constructor(
    token: string,
    residenceInfo: ResidenceInfo,
    loginData: object,
    log: Logger,
  ) {
    this.token = token;
    this.residenceID = residenceInfo.id;
    this.homeAwayStatus_ = residenceInfo.status;
    this.loginData = loginData;
    this.log = log;
  }

  static async create(
    email: string,
    password: string,
    residenceName: string,
    log: Logger,
  ): Promise<LevitonResidence> {
    const loginResponse = await axios.post(
      `${baseURL}/Person/login?include=user`,
      {
        email,
        password,
      },
      {
        timeout: 5000,
      },
    );
    if (
      !loginResponse.data ||
      !('id' in loginResponse.data && 'userId' in loginResponse.data)
    ) {
      throw new Error('Could not log in to Leviton API: invalid credentials?');
    }
    const token = loginResponse.data.id as string;
    const personID = loginResponse.data.userId as string;
    const headers = {
      'X-Access-Token': token,
    };

    // Get account ID from permissions API
    const permissionsResponse = await axios.get(
      `${baseURL}/Person/${personID}/residentialPermissions`,
      { headers },
    );
    if (
      !permissionsResponse.data ||
      !permissionsResponse.data.length ||
      !('residentialAccountId' in permissionsResponse.data[0])
    ) {
      throw new Error('Could not get account ID from Leviton API');
    }
    // There may be multiple accounts per the API, but in practice there is only one
    const accountID = permissionsResponse.data[0]
      .residentialAccountId as number;

    // Find residences for given account that matches provided residence name
    const residencesResponse = await axios.get(
      `${baseURL}/ResidentialAccounts/${accountID}/residences`,
      { headers },
    );
    if (!residencesResponse.data || !residencesResponse.data.length) {
      throw new Error('No residences returned from Leviton API');
    }
    const residence = (residencesResponse.data as ResidenceInfo[]).find(
      (res) => res.name === residenceName,
    );
    if (!residence) {
      throw new Error(`Could not find residence with name ${residenceName}`);
    }

    return new LevitonResidence(
      token,
      residence,
      loginResponse.data as object,
      log,
    );
  }

  get homeAwayStatus(): HomeAwayStatus {
    return this.homeAwayStatus_;
  }

  async updateHomeAwayStatus(status: 'HOME' | 'AWAY') {
    if (status === this.homeAwayStatus_) {
      return;
    }
    this.homeAwayStatus_ = status;
    axios.put(
      `${baseURL}/Residences/${this.residenceID}`,
      {
        status,
      },
      {
        headers: {
          'X-Access-Token': this.token,
        },
      },
    );
  }

  subscribeToHomeAwayStatus(callback: (status: 'HOME' | 'AWAY') => void) {
    const ws = new ReconnectingWebSocket(
      'wss://my.leviton.com/socket/websocket',
      [],
      { WebSocket: WebSocket },
    );

    ws.addEventListener('open', () => {
      this.log.debug('Socket connection opened');
    });

    ws.addEventListener('close', () => {
      this.log.error('Socket connection closed');
    });

    ws.addEventListener('error', (err) => {
      this.log.error('Socket could not be opened', err);
    });

    ws.addEventListener('message', (message) => {
      try {
        const data = JSON.parse(message.data);

        if (data.type === 'challenge') {
          const response = JSON.stringify({ token: this.loginData });
          ws.send(response);
        }
        if (data.type === 'status' && data.status === 'ready') {
          ws.send(
            JSON.stringify({
              type: 'subscribe',
              subscription: {
                modelName: 'Residence',
                modelId: this.residenceID,
              },
            }),
          );
        }
        if (data.type === 'notification' && data.notification.data.Residence) {
          const status: 'HOME' | 'AWAY' = data.notification.data.Residence.find(
            (res) => res.id === this.residenceID,
          ).status;
          this.log.debug(`Received home/away change notification: ${status}`);
          callback(status);
        }
      } catch (err) {
        this.log.error(`Received bad json: ${String(message.data)}`);
      }
    });

    // Send heartbeat every 60 seconds
    setInterval(() => ws.send('{}'), 60000);
  }
}
