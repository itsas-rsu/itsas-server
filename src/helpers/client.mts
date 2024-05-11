class Client {
    id: string
    res: any
    constructor(response: any, id: string) {
      this.res = response;
      this.id = id;
    }
  }

  export default Client