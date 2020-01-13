import Process from '../internal/process';
import Message from './message';
import Event from '../internal/event';
import { EventEmitter } from 'events';

/**
 * Clase Client
 * Simula el cliente de una aplicación
 */
export default class Client extends EventEmitter {

    private _id: string;            // ID único del cliente
    private _process: Process;      // Proceso responsable del cliente

    /**
     * Constructor
     * @param id id del cliente
     * @param ip ip del cliente
     * @param port puerto de escucha
     */
    constructor(id: string, ip: string, port: number) {
        super();
        this._id = id;
        this._process = new Process("p-" + id, ip, port);
    }
    
    /**
     * Devuelve el id del cliente
     */
    get id(): string {
        return this._id;
    }

    /**
     * Inicia el cliente, e inicia la escucha de eventos
     */
    public async init(): Promise<void> {

        // Cuando el proceso recibe un evento, el cliente lo retransmite a la aplicación
        this._process.on('message', (event: Event) => {
            this.emit('message', event);
        });

        return await this._process.init();
    }

    /**
     * Conecta el cliente con otro cliente
     * @param ip ip de otro cliente
     * @param port puerto de otro cliente
     */
    public connect(ip: string, port: number): void {
        this._process.connect(ip, port);

        console.log("Cliente " + this._id + " conectado a " + ip + ":" + port);
    }

    /**
     * Cierra el cliente y sus conexiones correctamente
     */
    public close(): void {
        this._process.close();
    }

    /**
     * Envia un mensaje siguiendo el protocolo EpTo
     * @param msg Mensaje a enviar
     */
    public epToBroadcast(msg: Message): void {
        this._process.epToBroadcast(msg);
    }
}

/**
 * Programa principal genérico para la ejecución
 * de un cliente individual de forma local
 */
if(typeof module !== 'undefined' && !module.parent) {

    // Se asegura de recibir todos los parametros
    if(process.argv.length != 5) {
        console.log("Use: ts-node client.ts <id> <ip> <port>");
        process.exit();
    }

    // Obtiene los parametros
    const id: string = process.argv[2];
    const ip: string = process.argv[3];
    const port: number = parseInt(process.argv[4]);

    // Creamos e iniciamos el cliente
    const client = new Client(id, ip, port);

    client.init()
    .then(() => {

        // Una vez iniciado, escuchamos e imprimimos eventos recibidos en cuanto lleguen
        client.on('message', (event: Event) => {
            console.log(event.sourceId + "(" + event.id +  ") > " + event.msg.data);
        });

        // Escuchamos la entrada para conectarnos a más clientes o enviar mensajes
        const stdin = process.openStdin();
        stdin.addListener("data", function(d) {
            const cmd: string = d.toString().trim();

            const args = cmd.split(":");
            
            if(args.length == 3 && args[0] == "connect") {
                client.connect(args[1], parseInt(args[2]));
            } else {
                client.epToBroadcast(new Message(cmd));
            }
        });

    })
    .catch((error: any) => {
        console.log("Error al iniciar cliente " + id);
        console.log(error);
        process.exit();
    });
    
    // Escucha la señal CTRL + C y cierra el programa correctamente
    process.on('SIGINT', function() {
        client.close();
        process.exit();
    });
}