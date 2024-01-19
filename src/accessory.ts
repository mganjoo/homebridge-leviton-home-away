import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { LevitonHomeAwayPlatform } from './platform';
import { LevitonResidence } from './api';

export class HomeOccupiedSwitchAccessory {
  private service: Service;

  constructor(
    private readonly platform: LevitonHomeAwayPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly residence: LevitonResidence,
  ) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Leviton')
      .setCharacteristic(this.platform.Characteristic.Model, 'Gen 2')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        'Default-Serial',
      );

    this.service =
      this.accessory.getService(this.platform.Service.Switch) ||
      this.accessory.addService(this.platform.Service.Switch);

    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      this.accessory.displayName,
    );

    this.service
      .getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));

    residence.subscribeToHomeOccupied((occupied) => {
      this.service
        .getCharacteristic(this.platform.Characteristic.On)
        .updateValue(occupied);
    });
  }

  async setOn(value: CharacteristicValue) {
    await this.residence.updateHomeOccupied(!!value);
  }

  async getOn(): Promise<CharacteristicValue> {
    return this.residence.homeOccupied;
  }
}
