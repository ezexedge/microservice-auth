export default class BaseException {
    public message: string;
  
    public statusCode: number;
  
    public codeMessageLanguage: string;
  
    public stack: string | undefined;
  
    public error: Error | undefined;
  
    constructor(
      message: string,
      statusCode: number,
      codeMessageLanguage: string,
      stack: string | undefined = undefined,
      error: Error | undefined = undefined,
    ) {
      this.message = message;
      this.statusCode = statusCode;
      this.codeMessageLanguage = codeMessageLanguage;
      this.stack = stack;
      this.error = error;
    }
  
    toString(): string {
      return this.message;
    }
  
    toJsonResponse() {
      return { status: "error", message: this.message };
    }
  }
  