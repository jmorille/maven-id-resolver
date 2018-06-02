import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import mavenParser, {Artifact} from "mvn-artifact-name-parser";
import mavenUrl from "mvn-artifact-url";
import mavenFileName from "mvn-artifact-filename";
import fetch from "node-fetch";

export interface ArtifactDownload {
    artifact: Artifact;
    destDir: string;
    filename: string;
    sha1: string;
    md5?: string;
    isOk?: boolean;
    sha1Ok?: boolean;
    md5Ok?: boolean;
    elapsedMs?: string;
}

interface ArtifactDownloadTmp extends ArtifactDownload{
    destFileTmp: string;
}

export default function downloadArtifacts(ids: string[], destDir: string, repository: string): Promise<ArtifactDownload[]>{
    const promises = ids.map(id => {
        return downloadArtifact(id, destDir, repository);
    });
    return Promise.all(promises);
}

export function downloadArtifact(artifactId: string, destDir?: string, repository?: string, filename?: string): Promise<ArtifactDownload>{
    // Parameters
    const start = process.hrtime();
    const artifact = mavenParser(artifactId);
    //console.log(" * Param Maven artifact", artifact);
    //console.log(' * Param directory', destDir);
    const repositoryUrl = repository && !repository.endsWith('/') ? repository + '/' : repository;
    return mavenUrl(artifact, repositoryUrl).then(url => {
        //console.log("Maven Url", url);
        return [
            fetch(url).then(writeResponsePromise(artifact, destDir))
                .then(res => ({...res, url, filename: filename ? filename : res.filename})),
            fetchHash(url, 'sha1'),
            fetchHash(url, 'md5')
        ]
    })
        .then(promises => Promise.all(promises as Promise<any>[]))
        .then(([resArtifact, sha1, md5]) => {
            const sha1Ok = resArtifact.sha1 === sha1;
            const md5Ok = resArtifact.md5 === md5;
            const isOk = sha1Ok && md5Ok;
            return {...resArtifact, isOk, sha1Ok, md5Ok, sha1Src: sha1, md5Src: md5};
        })
        .then(renameToFinalName)
        .then(res => {
            const elapsed = process.hrtime(start)[1] / 1000000; // divide by a million to get nano to milli
            const elapsedMs = elapsed.toFixed(0);
            return {...res, elapsedMs}
        });
}


function fetchHash(artifactUrl: string, algo: string) {
    return fetch(`${artifactUrl}.${algo}`).then(res => res.text())
}

function writeResponsePromise(artifact: Artifact, destDir: string) {
    //console.log(`Epected write`, artifact, `  to directory ${destDir}`);
    return function (res: any): Promise<ArtifactDownloadTmp> {
        const filename = mavenFileName(artifact);
        const filenameTmp = `${filename}-tmp`;
        const destFileTmp = destDir ? path.join(destDir, filenameTmp) : filenameTmp;
        //console.log(`Epected write  to file ${destFileTmp}`);
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
                resolve({destDir, filename, sha1, md5, destFileTmp, artifact});
            });
            res.body.pipe(dest);
            dest.on('error', err => {
                reject(err);
            });
        })
    }
}


function renameToFinalName(result: ArtifactDownloadTmp): ArtifactDownload {
    //console.log(`Epected rename`, result.destFileTmp, `  to directory ${result.filename}`);
    const {destFileTmp, ...res} = result;
    const {destDir, filename} = res;
    if (result.isOk) {
        const destFile = destDir ? path.join(destDir, filename) : filename;
        fs.unlink(destFile, err => { });
        fs.rename(destFileTmp, destFile, err => {
            if (err) {
                const errDelMsg = `Could not rename to ${destFileTmp} to ${destFile}`;
                console.error(errDelMsg);
                fs.unlink(destFileTmp, err2 => {
                });
                throw err
            }
        });
    } else {
        fs.unlink(destFileTmp, err => {
            if (err) {
                console.log(`Could not delete ${destFileTmp}`)
            }
        });
    }
    return res;
}