//#!/usr/bin/env node

import {docopt} from 'docopt';
import * as clc from 'cli-color';
import * as asciify from 'asciify';
import mavenDownload, {ArtifactDownload} from './maven-download'


const doc = `
Usage:
 mvn-dl <artifact>... [options]
Options:
 -d --destination <destination>  Destination folder 
 -r --repository <url>           Url to the maven repo
Examples:
 # download jar
 maven-id-resolver org.apache.commons:commons-lang3:3.4
 # download from other repository
 maven-id-resolver org.apache.commons:commons-lang3:3.4 -r http://nexus/repository/maven-releases
 # download jar to dist
 maven-id-resolver org.apache.commons:commons-lang3:3.4 -d dist
`;
const args = docopt(doc, {version: require('../package.json').version});
const start = process.hrtime();
mavenDownload(
    args['<artifact>'],
    args['--destination'],
    args['--repository']
).then(resuls => {
    const allOk = resuls.reduce((acc: any, res: ArtifactDownload) => {
        const shaMsg = labelByError(`sha1=${res.sha1}`, res.sha1Ok);
        const md5Msg = labelByError(`md5=${res.md5}`, res.md5Ok);
        console.log(res.filename, labelOk(res.isOk), `sha1=${shaMsg}`, `md5=${md5Msg}`, `in ${res.elapsedMs}ms`);
        if (!res.isOk) {
            acc.bads.push(res);
        }
        return  {...acc,   allOk :  acc.allOk && res.isOk };
    }, { allOk: true, bads: [], artifacts:resuls } );
    return allOk;
}).then((res) => {
    const {allOk, bads} =res;
    if (!allOk) {
        const msgTitle = `
   ____                         _   __                ___    __             __         __
  / __/ ___  ____ __ __  ____  (_) / /_  __ __       / _ |  / / ___   ____ / /_       / /
 _\\ \\  / -_)/ __// // / / __/ / / / __/ / // /      / __ | / / / -_) / __// __/      /_/ 
/___/  \\__/ \\__/ \\_,_/ /_/   /_/  \\__/  \\_, /      /_/ |_|/_/  \\__/ /_/   \\__/      (_)`;
        console.error(clc.red(msgTitle));
        process.exit(1);
    }
    return res;
}).then(res => {
    const elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
    const elapsedMs = elapsed.toFixed(0);
    console.log("Download", res.artifacts.length, "files in ", elapsedMs,"ms");
    return res;
}).catch(err => {
    console.error(err);
    process.exit(1);
});

function labelOk(isOk: boolean): string {
    const msg = isOk? "Ok": 'Ko';
    return labelByStatus(msg, isOk);
}


function labelByStatus(msg:string, isOk: boolean): string {
    return isOk ? clc.green(msg) : clc.red(msg);
}

function labelByError(msg:string, isOk: boolean): string {
    return isOk ? msg : clc.red(msg);
}


