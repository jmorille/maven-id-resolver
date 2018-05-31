"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mvn_artifact_name_parser_1 = require("mvn-artifact-name-parser");
const mvn_artifact_url_1 = require("mvn-artifact-url");
const artifact = mvn_artifact_name_parser_1.default('org.apache.commons:commons-lang3:3.4');
console.log("Maven artifact", artifact);
mvn_artifact_url_1.default(artifact, undefined).then(url => {
    console.log("Maven Url", url);
});
