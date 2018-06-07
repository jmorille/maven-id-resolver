'use strict';
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import mavenParser, {Artifact} from "mvn-artifact-name-parser";
import mavenUrl from "mvn-artifact-url";
import mavenFileName from "mvn-artifact-filename";
import fetch, {Response} from "node-fetch";
import {access} from "fs";

export interface ArtifactInfo {
    mavenId: string;
    artifact: Artifact;
    url: string;
}

export interface ArtifactDownloadFile extends ArtifactInfo {
    file: ArtifactFile;
}

export interface ArtifactDownload extends ArtifactDownloadFile {
    file: ArtifactFile;
    elapsedMs: number;
}

interface ArtifactFileInfo {
    statusCode: number;
    destDir: string;
    filename: string;
    sha1: string;
    md5: string;
}

interface ArtifactFileInfoHash {
    sha1Src: string;
    md5Src: string;
    isOk: boolean;
    sha1Ok: boolean;
    md5Ok: boolean;
}

interface ArtifactFileTemp extends ArtifactFileInfo {
    destFileTmp?: string;
}

interface ArtifactFileVerify extends ArtifactFileTemp, ArtifactFileInfoHash {
}

export interface ArtifactFile extends ArtifactFileInfo, ArtifactFileInfoHash {
}

interface MultiArtifactDownload {
    artifacts: ArtifactDownload[];
    isOk: boolean;
    elapseTime: string;
}

export default function downloadArtifacts(ids: string[], destDir: string, repository: string): Promise<MultiArtifactDownload> {
    const hrstart = process.hrtime();
    // Prepare All dOwnload
    const promises:Promise<ArtifactDownload>[] = ids.map(id => {
        return downloadArtifact(id, destDir, repository);
    });
    return Promise.all(promises)
        .then(artifacts=> {
            const isOk =artifacts.reduce( (acc:boolean, arti:ArtifactDownloadFile) => {
                return acc && arti.file.isOk
            }, true );
            return {artifacts, isOk};
        })
        .then(res => {
        const diff = process.hrtime(hrstart);
        const elapseTime = `${diff[0]}s ${Math.floor(diff[1] / 1000000)}ms`;
        return {...res,elapseTime};
    });
}

export function downloadArtifact(mavenId: string, destDir?: string, repository?: string): Promise<ArtifactDownload> {
    const start = process.hrtime();
    return parseMavenId(mavenId, repository)
        .then(downloadArtifactWithHash(destDir))
        .then(res => {
            const end = process.hrtime(start);
            const elapsed = end[0] * 1000 + end[1] / 1000000; // divide by a million to get nano to milli
            const elapsedMs = Math.floor(elapsed);
            return {...res, elapsedMs}
        });
}


export function parseMavenId(mavenId: string, repository?: string): Promise<ArtifactInfo> {
    const artifact = mavenParser(mavenId);
    const repositoryUrl = repository && !repository.endsWith('/') ? repository + '/' : repository;
    return mavenUrl(artifact, repositoryUrl).then(url => {
        return {mavenId, artifact, url};
    });
}

export function downloadArtifactWithHash(destDir: string) {
    return function (artifactInfo: ArtifactInfo): Promise<ArtifactDownloadFile> {
        const {url, artifact} = artifactInfo;
        const filename = mavenFileName(artifact);
        const promises: [Promise<ArtifactFileTemp>, Promise<string>, Promise<string>] = [
            fetchArtifact(url, destDir, filename),
            fetchArtifactHash(url, 'sha1'),
            fetchArtifactHash(url, 'md5')
        ];
        return Promise.all(promises)
            .then(verifyArtifactHash)
            .then(renameToFinalName)
            .then((file: ArtifactFile) => {
                return {...artifactInfo, file};
            });
    };
}


function fetchArtifact(artifactUrl: string, destDir: string, filename: string): Promise<ArtifactFileTemp> {
    return fetch(artifactUrl).then((res: Response): Promise<ArtifactFileTemp> => {
        // Response
        const statusCode = res.status;
        // Response KO
        if (!res.ok) {
            return new Promise((resolve, reject) => {
                resolve({statusCode, destDir, filename, sha1: undefined, md5: undefined});
            });
        }
        // Response Download
        const filenameTmp = `${filename}-tmp`;
        const destFileTmp = destDir ? path.join(destDir, filenameTmp) : filenameTmp;
        return new Promise((resolve, reject) => {
            // Hasher
            const hash = crypto.createHash('sha1');
            const hashMd5 = crypto.createHash('md5');
            const dest = fs.createWriteStream(destFileTmp);
            // Stream Error
            res.body.on('error', (err: any) => {
                reject(err)
            });
            dest.on('error', err => {
                reject(err);
            });
            // Update Hash
            res.body.on('data', (chunk: any) => hash.update(chunk));
            res.body.on('data', (chunk: any) => hashMd5.update(chunk));
            // Return response
            dest.on('finish', () => {
                const sha1 = hash.digest('hex');
                const md5 = hashMd5.digest('hex');
                resolve({statusCode, destDir, filename, destFileTmp, sha1, md5});
            });
            // Pipe to files
            res.body.pipe(dest);
        });
    })
}


export function fetchArtifactHash(artifactUrl: string, algo: string): Promise<string> {
    return fetch(`${artifactUrl}.${algo}`)
        .then(res => {
            return res.ok ? res.text() : undefined;
        });
}


export function verifyArtifactHash([fileInfo, sha1, md5]: [ArtifactFileTemp, string, string]): ArtifactFileVerify {
    const sha1Ok = sha1 ? fileInfo.sha1 === sha1 : false;
    const md5Ok = md5 ? fileInfo.md5 === md5 : false;
    const isOk = sha1Ok && md5Ok;
    return {...fileInfo, sha1Ok, md5Ok, sha1Src: sha1, md5Src: md5, isOk}
}


function renameToFinalName(result: ArtifactFileVerify): ArtifactFile {
    //console.log(`Epected rename`, result.destFileTmp, `  to directory ${result.filename}`);
    const {destFileTmp, ...res} = result;
    const {destDir, filename} = res;
    if (result.isOk) {
        const destFile = destDir ? path.join(destDir, filename) : filename;
        fs.unlink(destFile, ignoreError);
        fs.rename(destFileTmp, destFile, err => {
            if (err) {
                const errDelMsg = `Could not rename to ${destFileTmp} to ${destFile}`;
                console.error(errDelMsg);
                fs.unlink(destFileTmp, ignoreError);
                throw err
            }
        });
    } else {
        fs.unlink(destFileTmp, ignoreError);
    }
    return res;
}

function ignoreError(err: Error) {
    if (err) {
        // Ignore Error
    }
}
