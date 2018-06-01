import * as fs from 'fs';
import * as crypto from 'crypto';

import fetch from 'node-fetch';

import mavenParser from 'mvn-artifact-name-parser'
import mavenUrl from 'mvn-artifact-url'
import mavenFileName from 'mvn-artifact-filename'

// Config
const repositoryUrl = 'http://nexus.agrica.loc/repository/maven-releases/';

// groupId:artifactId:packaging:classifier:version
// const artifactId = 'org.apache.commons:commons-lang3:3.4';
const artifactId = 'fr.agrica.horodatage:hor-front-web:war:exec:0.0.1-M2';


function downloadArtifact(artifactId: string) {
    //
    const artifact = mavenParser(artifactId);
    console.log("Maven artifact", artifact);

    return mavenUrl(artifact, repositoryUrl).then(url => {
        console.log("Maven Url", url);
        return fetch(url);
    }).then(res => {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha1');
            const hashMd5 = crypto.createHash('md5');
            const filename = mavenFileName(artifact);
            const dest = fs.createWriteStream(`./${filename}`);
            res.body.on('error', err => {
                reject(err)
            });
            res.body.on('data', chunk => hash.update(chunk));
            res.body.on('data', chunk => hashMd5.update(chunk));
            dest.on('finish', () => {
                const sha1 = hash.digest('hex');
                const md5 = hashMd5.digest('hex');
                resolve({filename, sha1, md5});
            });
            res.body.pipe(dest);
            dest.on('error', err => {
                reject(err);
            });
        });
    });

}


downloadArtifact(artifactId).then(hash => {
    console.log(hash);
    return hash;
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
