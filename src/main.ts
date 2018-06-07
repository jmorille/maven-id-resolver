'use strict';
import {docopt} from 'docopt';
import * as clc from 'cli-color';
import mavenDownload, {ArtifactDownload} from './maven-download'


const doc = `
Usage:
 mvn-dl <artifact>... [options]
Options:
 -d --destination <destination>  Destination folder 
 -r --repository <url>           Url to the maven repo
Examples:
 # download jar as format groupId:artifactId:packaging:classifier:version 
 maven-id-resolver org.apache.commons:commons-lang3:3.4
 # download multi jar
 maven-id-resolver com.google.guava:guava:25.1-jre com.google.guava:guava::sources:25.1-jre com.google.guava:guava:jar:javadoc:25.1-jre
 # download from other repository
 maven-id-resolver org.apache.commons:commons-lang3:3.4 -r http://nexus/repository/maven-releases
 # download jar to dist
 maven-id-resolver org.apache.commons:commons-lang3:3.4 -d dest
`;
const args = docopt(doc, {version: require('../package.json').version});
const hrstart = process.hrtime();
mavenDownload(
    args['<artifact>'],
    args['--destination'],
    args['--repository']
).then(res => {
    // Print Download Files
    res.artifacts.forEach(artifact => {
        const file = artifact.file;
        const shaMsg = labelByError(`${file.sha1}`, file.sha1Ok);
        const md5Msg = labelByError(`${file.md5}`, file.md5Ok);
        // console.log(res.url);
        // console.log(res.artifact);
        console.log(file.filename, labelOk(file.isOk, artifact), `sha1=${shaMsg}`, `md5=${md5Msg}`, `in ${artifact.elapsedMs}ms`);
    });
    // Print Status
    if (res.isOk) {
        console.info("All files downloaded",clc.green( "SuccessFull"),"in", res.elapseTime);
    } else {
        console.error(clc.red(getTextSecurityAlert()));
        process.exit(1);
    }
    return res;
}).catch(err => {
    console.error(clc.red(`
-------------------------------------------------- 
-------------     ERROR             -------------- 
--------------------------------------------------`));
    process.exit(1);
});


function getTextSecurityAlert() {
    return  `
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


