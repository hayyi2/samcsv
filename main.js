import './main.css';
import Alpine from 'alpinejs'
import Papa from 'papaparse'

function getStrTime() {
    return (new Date()).toTimeString().split(" ").shift()
}

Alpine.data('main', () => ({
    loading: false,

    dirHandler: null,
    fileHandler: null,
    openFilename: '',

    limitRow: 1000,
    listFile: [],
    logs: [],

    async openDir() {
        this.resetLog()
        try {
            this.dirHandler = await window.showDirectoryPicker({ mode: 'readwrite' })
            if (this.dirHandler) {
                this.listFile = []
                for await (const entry of this.dirHandler.values()) {
                    if (entry.kind == 'file' && entry.name.endsWith('.csv')) {
                        this.listFile.push(entry.name);
                    }
                }
            }
        } catch (error) {
            console.log("Cancel open dir ...")
        }
    },

    async closeDir() {
        this.resetLog()
        this.dirHandler = null
        this.listFile = []
    },

    async openFile(filename) {
        this.resetLog()
        this.fileHandler = await this.dirHandler.getFileHandle(filename)
        this.openFilename = filename
    },

    async closeFile() {
        this.resetLog()
        this.fileHandler = null
        this.openFilename = ''
    },

    async resetLog() {
        this.logs = []
    },

    async addLog(message) {
        this.logs.push({ time: getStrTime(), message, })
    },

    async splitFile() {
        this.resetLog()
        if (this.loading) {
            this.addLog("Masih loading, sabar masee...")
            return
        }
        if (!this.limitRow) {
            this.addLog('⚠️Tambahkan limit rows!')
            return
        }

        this.addLog('Start process')
        this.loading = true
        this.addLog('Reading: ' + this.openFilename)
        const file = await this.fileHandler.getFile();
        const csvString = await file.text();
        const parse = Papa.parse(csvString);
        this.addLog('- Finish read')

        const count_split = Math.ceil(parse.data.length / this.limitRow);
        let newFileHandle, writable, csv_data;
        for (let index = 0; index < count_split; index++) {
            this.addLog('Creating file: ' + 'split-' + (index + 1) + '-' + this.openFilename)
            newFileHandle = await this.dirHandler.getFileHandle('split-' + (index + 1) + '-' + this.openFilename, { create: true, });
            writable = await newFileHandle.createWritable();
            csv_data = Papa.unparse([parse.data[0], ...parse.data.splice(1, this.limitRow)])
            await writable.write(csv_data);
            await writable.close();
            this.addLog('- File created')
        }
        this.addLog('Finish process')

        this.loading = false
    },

    async mergeFile() {
        this.resetLog()
        if (this.loading) {
            this.addLog("Masih loading, sabar masee...")
            return
        }

        this.addLog('Start process')
        this.loading = true
        const outputFile = "merge.csv"
        let fileData = []
        let no = 0
        for (const filename of this.listFile) {
            this.addLog('Reading: ' + filename)
            const currentFile = await this.dirHandler.getFileHandle(filename)
            const file = await currentFile.getFile();
            const csvString = await file.text();
            const parse = Papa.parse(csvString);
            if (no++ === 0) {
                fileData.push(parse.data[0])
            }
            fileData = fileData.concat(parse.data.splice(1, parse.data.length))
            this.addLog('- Finish read')

        }
        this.addLog('Creating file: ' + outputFile)
        const newFileHandle = await this.dirHandler.getFileHandle(outputFile, { create: true, })
        const writable = await newFileHandle.createWritable();
        await writable.write(Papa.unparse(fileData));
        await writable.close();
        this.addLog('- File created')
        this.addLog('Finish process')

        this.loading = false
    },

}))

Alpine.start()