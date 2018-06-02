//#!/usr/bin/env node

import {docopt} from 'docopt';
import * as clc from 'cli-color';
import mavenDownload, {ArtifactDownload} from './maven-download'


const doc = `
Usage:
 mvn-dl <artifact> [options]
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

mavenDownload(
    args['<artifact>'],
    args['--destination'],
    args['--repository']
).then(resuls => {
    const allOk = resuls.reduce((acc: boolean, res: ArtifactDownload) => {
        console.log(res.filename, labelOk(res.isOk), `(sha1=${res.sha1}, md5=${res.md5})`, `in ${res.elapsedMs}ms`);
        return acc && res.isOk;
    }, true);
    return allOk;
}).then(allOk => {
    if (!allOk) {
        console.error(clc.red("Some file are incorect Hash"));
        process.exit(1)
    }
}).catch(err => {
    console.error(err);
    process.exit(1);
});

function labelOk(isOk: boolean): string {
    return isOk ? clc.green("Ok") : clc.red('Ko');
}


// function checksumFile(algorithm, path) {
//     return new Promise((resolve, reject) =>
//         fs.createReadStream(path)
//             .on('error', reject)
//             .pipe(crypto.createHash(algorithm).setEncoding('hex'))
//             .once('finish', function () {
//                 resolve(this.read())
//             })
//     )
// }
