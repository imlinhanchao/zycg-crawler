const fs = require('fs');

let data = require('./data/data');
let excel = []

for(let i = 0; i < data.length; i++) {
    let typeData = data[i];
    let type = typeData.name.replace(/\[|\]/g, '');
    for(let j = 0; j < typeData.data.length; j++) {
        let categroyData = typeData.data[j]
        let categroy = categroyData.name.replace(/\(\d+\)/, '');
        for(let k = 0; k < categroyData.data.length; k++) {
            let vendorDate = categroyData.data[k];
            let vendor = vendorDate.name.replace(/\(\d+\)/, '');
            for(let l = 0; l < vendorDate.data.length; l++) {
                let productData = vendorDate.data[l];
                let product = productData.name;
                for(let m = 0; m < productData.data.length; m++) {
                    let supplier = productData.data[m];
                    let d = Object.assign({
                        type, categroy, vendor, product
                    }, supplier)
                    excel.push(d);
                }
            }
        }
    }
}

excel = excel.map(e => `"${e.type}","${e.categroy}","${e.vendor}","${e.product}","${e.buyer.trim()}","${parseInt(e.count.trim())}","${e.price.trim()}","${e.name}","${e.date.trim()}","${e.address.trim()}","${e.person.trim()}","${e.phone.trim()}","${e.email.trim()}","${e.fax.trim()}"`)
fs.writeFileSync('data/data.csv', excel.join('\n'));