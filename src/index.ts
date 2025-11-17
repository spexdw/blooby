/**
 *
 * Blooby - A modern database solution for Next.js
 *  
 * @author SpeX
 * 
**/

// Library Imports
import { version } from '../package.json';
import * as Utils from './utils';
import * as Bob from './types';


// Main Logic
export class Blooby {
  private config: Bob.BloobyConfig;

  constructor(pathName: string = "./blooby_data") {
    this.config = {
      storagePath: pathName,
    };

    Utils.initalizePath(this.config.storagePath);
    Utils.printInfo(" v" + version + " initialized.");
  }

  public getVersion() {
    return "v" + version;
  }

}

export default Blooby;
