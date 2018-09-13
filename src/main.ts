'use strict';
import {docopt} from 'docopt';
import * as clc from 'cli-color';
import downloadArtifacts, {  MultiArtifactDownload, ArtifactDownload} from './maven-download';


const doc = `
Usage:
 mvn-dl <artifact>... [options]
Options:
 -d --destination <destination>  Destination folder 
 -r --repository <url>           Url to the maven repo
 --hash-file                     Write the Hash in a file postfix by algo
 --hash-url                      Write the Hash Url
Examples:
 # download jar as format groupId:artifactId:packaging:classifier:version (https://maven.apache.org/pom.html#Maven_Coordinates)
 maven-id-resolver org.apache.commons:commons-lang3:3.4
 # download multi jar
 maven-id-resolver com.google.guava:guava:25.1-jre com.google.guava:guava::sources:25.1-jre com.google.guava:guava:jar:javadoc:25.1-jre
 # download from other repository
 maven-id-resolver org.apache.commons:commons-lang3:3.4 -r http://nexus/repository/maven-releases
 # download jar to dist
 maven-id-resolver org.apache.commons:commons-lang3:3.4 -d dest
 # download jar to dist with hash infos
 maven-id-resolver org.apache.commons:commons-lang3:3.4 --hash-file --hash-url -d dest 
`;
const args = docopt(doc, {version: require('../package.json').version});
//const hrstart = process.hrtime();
downloadArtifacts(
    args['<artifact>'],
    args['--destination'],
    args['--repository'],
    {
        writeHash: args['--hash-file'],
        writeHashUrl: args['--hash-url']
    }
).then( (response:MultiArtifactDownload) => {
    const data = response;
    // Print Download Files
    data.artifacts.forEach(artifact => {
        const file = artifact.file;
        const shaMsg = labelByError(`${file.sha1}`, file.sha1Ok);
        const md5Msg = labelByError(`${file.md5}`, file.md5Ok);
        // console.log(res.url);
        // console.log(res.artifact);
        console.log(file.filename, labelOk(file.isOk, artifact), `sha1=${shaMsg}`, `md5=${md5Msg}`, `in ${artifact.elapsedMs}ms`);
    });
    // Print Status
    //console.log(JSON.stringify(res, null, 2));
    if (data.isOk) {
        console.info("All files downloaded", clc.green("SuccessFull"), "in", data.elapseTime);
    } else {
        console.error(clc.red(getTextSecurityAlert()));
        console.log(JSON.stringify(data, null, 2));
        process.exit(1);
    }
    return data;
}).catch(err => {
    console.error(clc.red(`
-------------------------------------------------- 
-------------     ERROR             -------------- 
--------------------------------------------------`));
    process.exit(1);
});


function getTextSecurityAlert() {
    return `
   ____                         _   __                ___    __             __         __
  / __/ ___  ____ __ __  ____  (_) / /_  __ __       / _ |  / / ___   ____ / /_       / /
 _\\ \\  / -_)/ __// // / / __/ / / / __/ / // /      / __ | / / / -_) / __// __/      /_/ 
/___/  \\__/ \\__/ \\_,_/ /_/   /_/  \\__/  \\_, /      /_/ |_|/_/  \\__/ /_/   \\__/      (_)`;

}

function labelOk(isOk: boolean, res: ArtifactDownload): string {
    const msg = isOk ? `Ok (${res.file.statusCode})` : `Ko (${res.file.statusCode}) `;
    return labelByStatus(msg, isOk);
}


function labelByStatus(msg: string, isOk: boolean): string {
    return isOk ? clc.green(msg) : clc.red(msg);
}

function labelByError(msg: string, isOk: boolean): string {
    return isOk ? msg : clc.red(msg);
}


