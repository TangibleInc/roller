
// replaceStrings

const buildTimeValues = {
  date: __buildDate__,
  version: __buildVersion__
}

console.log('Build time', buildTimeValues)

// replaceCode

const runTimeValues = {
  date: __currentDate__,
  version: __currentVersion__
}

console.log('Run time', runTimeValues)
