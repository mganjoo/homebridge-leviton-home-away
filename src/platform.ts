import {
  API,
  DynamicPlatformPlugin,
  Logger,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { HomeOccupiedSwitchAccessory } from './accessory';
import { LevitonResidence } from './api';

export class LevitonHomeAwayPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic =
    this.api.hap.Characteristic;

  // For cached accesories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform');

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * Register discovered accessories.
   */
  async discoverDevices() {
    try {
      if (
        !this.config.email ||
        !this.config.password ||
        !this.config.homeName
      ) {
        this.api.unregisterPlatformAccessories(
          PLUGIN_NAME,
          PLATFORM_NAME,
          this.accessories,
        );
        this.log.error(
          'Please provide email, password, and homeName in config.json',
        );
        return;
      }
      const residence = await LevitonResidence.create(
        this.config.email,
        this.config.password,
        this.config.homeName,
        this.log,
      );

      // generate a unique id for the accessory from globally unique but constant string
      const uuid = this.api.hap.uuid.generate(
        `leviton_home_away_switch_${residence.residenceID}`,
      );

      // see if an accessory with the same uuid has already been registered and restored from
      // the cached devices we stored in the `configureAccessory` method above
      const existingAccessory = this.accessories.find(
        (accessory) => accessory.UUID === uuid,
      );

      if (existingAccessory) {
        this.log.info(
          'Restoring existing accessory from cache:',
          existingAccessory.displayName,
        );

        new HomeOccupiedSwitchAccessory(this, existingAccessory, residence);
      } else {
        this.log.info('Adding Home Occupied Switch');

        const accessory = new this.api.platformAccessory('Home Occupied', uuid);
        new HomeOccupiedSwitchAccessory(this, accessory, residence);

        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
          accessory,
        ]);
      }
    } catch (err) {
      this.log.error('Could not initialize plugin: ', err);
    }
  }
}
