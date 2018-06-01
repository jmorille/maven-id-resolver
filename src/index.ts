//#!/usr/bin/env node

import mavenDownload from './maven-download'
import { docopt } from 'docopt';
import {Artifact} from "mvn-artifact-url";



const doc = `
Usage:
 mvn-dl <artifact> [options]
Options:
 -d --destination <destination>  Destination folder
 -f --filename <filename>        Output filename
 -r --repository <url>           Url to the maven repo
Examples:
 # download jar
 maven-id-resolver org.apache.commons:commons-lang3:3.4
 # download jar to dist
 maven-id-resolver org.apache.commons:commons-lang3:3.4 -d dist
`;
const args = docopt(doc, { version: require('../package.json').version });
mavenDownload(
    args['<artifact>'],
    args['--destination'],
    args['--repository'],
    args['--filename']
).then(res => {
    console.log(res.filename, `(sha1=${res.sha1}, md5=${res.md5})`, `in ${res.elapsedMs}ms`);
    return res;
}).catch(err => {
    console.error(err);
});


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
