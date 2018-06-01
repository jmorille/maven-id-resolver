import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import mavenParser, {Artifact} from "mvn-artifact-name-parser";
import mavenUrl from "mvn-artifact-url";
import mavenFileName from "mvn-artifact-filename";
import fetch from "node-fetch";

interface ArtifactDownload {
    artifact: Artifact;
    destDir: string;
    filename: string;
    sha1: string;
    md5?: string;
}

interface ArtifactDownloadTmp extends ArtifactDownload {
    destFileTmp: string;
}

export default function downloadArtifact(artifactId: string,destination:string, repositoryUrl: string, filename:string) {
    //
    const  start = process.hrtime();

    const artifact = mavenParser(artifactId);
    //console.log("Maven artifact", artifact);

    return mavenUrl(artifact, repositoryUrl).then(url => {
        //console.log("Maven Url", url);
        return [
            fetch(url).then(writeResponsePromise(artifact)).then(res => ( {...res, url } ) ),
            fetchHash(url, 'sha1'),
            fetchHash(url, 'md5')
            ]
    })
        .then(promises =>  Promise.all(promises as [Promise<any>]))
        .then(([resArtifact, sha1, md5]) => {
            if (resArtifact.sha1 !== sha1) {
                console.error( resArtifact, " =?", sha1);
                throw new Error(`Remote Sha1 ${sha1} != ${resArtifact.sha1} or file ${resArtifact.destFileTmp}`)
            }
            if (resArtifact.md5 !== md5) {
                console.error( resArtifact, " =?", sha1);
                throw new Error(`Remote md5 ${md5} != ${resArtifact.md5} or file ${resArtifact.destFileTmp}`)
            }
            return resArtifact;
    }).then(renameToFinalName)
        .then(res => {
            const elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
            const elapsedMs = elapsed.toFixed(0);
            return {...res, elapsedMs}
        });
}


function fetchHash(artifactUrl:string, algo:string) {
    return fetch(`${artifactUrl}.${algo}`).then(res =>res.text())
}

function writeResponsePromise(artifact: Artifact) {
    return function (res: any): Promise<ArtifactDownloadTmp> {
        const destDir = './';
        const filename = mavenFileName(artifact);
        const destFileTmp = path.join(destDir, `${filename}-tmp`);
        return new Promise((resolve, reject) => {
            // Hasher
            const hash = crypto.createHash('sha1');
            const hashMd5 = crypto.createHash('md5');
            const dest = fs.createWriteStream(destFileTmp);
            res.body.on('error', (err: any) => {
                reject(err)
            });
            res.body.on('data', (chunk: any) => hash.update(chunk));
            res.body.on('data', (chunk: any) => hashMd5.update(chunk));
            dest.on('finish', () => {
                const sha1 = hash.digest('hex');
                const md5 = hashMd5.digest('hex');
                resolve({destDir, filename, sha1, md5 , destFileTmp, artifact});
            });
            res.body.pipe(dest);
            dest.on('error', err => {
                reject(err);
            });
        })
    }
}



function renameToFinalName(result: ArtifactDownloadTmp): ArtifactDownload {
    const {destFileTmp, ...res }  = result;
    const {destDir, filename} = res;
    const destFile = path.join(destDir, filename);
    fs.unlink(destFile, err => { if (err) {  console.log(`Could not delete ${destFile}`) } });
    fs.rename(destFileTmp, destFile, err => {
        if (err) {
            const errDelMsg = `Could not rename to ${destFileTmp} to ${destFile}`;
            console.error(errDelMsg);
            fs.unlink(destFileTmp, err2 => {});
            throw err
        }
    });
    return res;
}