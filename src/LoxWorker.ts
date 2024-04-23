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

export type LoxMessageType = "run" | "write" | "write-err" | "write-warn";

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
            default:
                console.warn("LoxWorker::parseMessage - Unhandled message type", data);
                break;
        }
        return data;
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
