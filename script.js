const fs = require('fs');
const util  = require('util');
const { Client } = require('ssh2');
const {spawn } = require('child_process');

const readSync = util.promisify(fs.readFile); 
const writeSync = util.promisify(fs.writeFile);

const getConfig = async ()=> {

    try {
        const configStream = await readSync('./config.json');
        
        return JSON.parse(configStream)
        
    } catch (error) {
        console.error('Error al buscar la configuracion...');
        
        return null;
    }
}

const createBackup = async (data)=>{
    try {
        const fecha = new Date; 
        await writeSync(`backup_${fecha.getDate()}-${fecha.getMonth()}-${fecha.getFullYear()}.json`, JSON.stringify(data))
        
        console.info('[Success] Operacion completa');
    } catch (error) {
        console.error(`[Error] ${err}`)
    }
}

const comandoPwd = (ssh)=>{
    return new Promise((resolve, reject)=>{
        ssh.exec('pwd',(err, stream)=>{
            if(err) throw reject(err); 
            stream.on('data', (respuesta)=>{
                resolve(respuesta.toString());
            });
            stream.on('error', (err)=>{
                reject(err)
            });
        });
    })
}

const sshReady= (config)=>{
    const ssh =  new Client;

    return new Promise((resolve, reject)=>{
        ssh.on('ready', async ()=>{
            console.info(`[Conectado] al cliente ${config.host}`);

            let data = await comandoPwd(ssh);
            ssh.end();
            resolve(data);
        })
        .on('error',(error) =>{
            console.log(error)
            ssh.end();
            reject(error);
        })
        .connect(config)
    });      
}

const connect = async(configs, veces, results)=>{
    const config = configs[veces];
    let resultTemp = {
        host: config.host,
        data: null,
        error: null, 
    };

    try {
        resultTemp.data = await sshReady(config); 
       
    } catch (error) {
        console.error(`[Error]`, error)
        resultTemp.error = error.toString();
    }
    
    results.push(resultTemp);

    if(veces > 0 ){
        return connect(conex, veces - 1, results);
    }

    return createBackup(results);
}

const init = async()=>{

    try {
        let conex = await getConfig();

        //si existe configuraciones inicia
        conex && connect(conex, conex.length -1 , []);

    } catch (error) {
        console.error(error)
    }
}

init();
