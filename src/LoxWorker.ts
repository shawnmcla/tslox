import { Lox } from "./Lox";
import { LoxIO } from "./LoxIO";

class LoxWorkerIO implements LoxIO {
    write(text: string): void {
        postMessage({ type: "write", text });
    }
    writeError(text: string): void {
        postMessage({ type: "write-err", text });
    }
    writeWarning(text: string): void {
        postMessage({ type: "write-warn", text });
    }
    registerLoxInstance(_: Lox): void {
        console.debug("LoxWorkerIO::registerLoxInstance - Ignored")
    }
}

export type LoxMessageType = "run" | "write" | "write-err" | "write-warn" | "set";

export interface LoxMessage {
    type: LoxMessageType;
}

export interface LoxRunMessage extends LoxMessage {
    script: string;
}

export interface LoxRunResponse extends LoxMessage {
    id: string;
}

export interface LoxStdoutMessage extends LoxMessage {
    text: string;
}

export interface LoxSetMessage extends LoxMessage {
    flag: string;
    value: string;
}

function setMessage(o: any): LoxSetMessage {
    if(o?.type !== "set") { throw new Error("Invalid message type"); }
    if(!o?.flag || typeof o.flag !== "string") { throw new Error("Invalid flag"); }
    if(!o?.value || typeof o.value !== "string") { throw new Error("Invalid value"); }
    return o as LoxSetMessage;
}

function runMessage(o: any): LoxRunMessage {
    if(o?.type !== "run") { throw new Error("Invalid message type"); }
    if(!o?.script || typeof o.script !== "string") { throw new Error("Invalid script"); }
    return o as LoxRunMessage;
}

class LoxWorker {
    private io = new LoxWorkerIO();
    private lox = new Lox(this.io);

    constructor(){
        console.info("LoxWorker initialized");
    }

    parseMessage(e: MessageEvent): LoxMessage {
        const { data } = e;
        switch(data?.type) {
            case "run":
                console.debug("LoxWorker::parseMessage - Received run message", data);
                return runMessage(data);
            case "set":
                console.debug("LoxWorker::parseMessage - Received set message", data);
                return setMessage(data);
            default:
                console.warn("LoxWorker::parseMessage - Unhandled message type", data);
                break;
        }
        return data;
    }
    
    setFlag(message: LoxSetMessage) {
        console.debug("LoxWorker::setFlag - Setting flag", message.flag, message.value);
        this.lox.setFlag(message.flag, message.value);
    }

    runScript(message: LoxRunMessage) {
        console.debug("LoxWorker::runScript - Running script", message.script);
        this.lox.runRepl(message.script);
    }

    handleMessage(e: MessageEvent) {
        const { data } = e;
        console.debug("LoxWorker:: Received message", data);
        const message = this.parseMessage(e);
        switch(message.type) {
            case "run":
                this.runScript(message as LoxRunMessage);
                break;
            case "set":
                this.setFlag(message as LoxSetMessage);
                break;
            default:
                console.warn("LoxWorker::handleMessage - Unhandled message type", message);
                break;
        }
    }
}

const worker = new LoxWorker();

onmessage = (e: MessageEvent) => {
    worker.handleMessage(e);
}
