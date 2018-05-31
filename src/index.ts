import mavenParser from 'mvn-artifact-name-parser'
import mavenUrl from 'mvn-artifact-url'

const artifact = mavenParser('org.apache.commons:commons-lang3:3.4')
mavenUrl(artifact, undefined).then(url => {
    console.log("Maven Url", url)

})
