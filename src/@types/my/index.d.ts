declare module "my" {
    export interface MyClass {
      username: string,
      password: string
    }

  import {Request} from 'express';

  export default interface RequestCustom extends Request
  {
      hosts: any;
  }
  // export = MyType;
}

