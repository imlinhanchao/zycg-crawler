const request = require('./req');
const { JSDOM } = require('jsdom');
const fs = require('fs');

fs.mkdir('data', (err) =>{});

let data = fs.existsSync('./data/data') ? require('./data/data') : [];
let __suppliers = {};
async function main() {
    let rsp = await request.get('http://www.zycg.gov.cn/td_xxlcpxygh/platform')
    let window = new JSDOM(rsp.body).window;
    let document = window.document;
    let types = document.getElementsByClassName('grade2');
    let categorys = document.getElementsByClassName('grade3');

    for (let i = data.length; i < types.length; i++) {
        let type = { name: types[i].textContent.trim() };
        type.data = [];
        console.log('get type:', type.name)
        let links = categorys[i].getElementsByTagName('a');
        for (let j = 0; j < links.length; j++) {
            type.data.push(await getCategory(links[j]))
        }
        data.push(type);
        fs.writeFileSync('data/data.json', JSON.stringify(data, null, 4))
    }
}

async function getCategory(link) {
    console.log('get category:', link.textContent.trim())
    let category = { name: link.textContent.trim() };
    category.data = [];
    let rsp = await request.get(link.href);
    let window = new JSDOM(rsp.body).window;
    let document = window.document;
    let vendors = Array.from(document.getElementsByClassName('content-left-lby-xy')[0].getElementsByTagName('a'));
    vendors = vendors.slice(1);
    for (let i = 0; i < vendors.length; i++) {
        category.data.push(await getVendor(vendors[i]))
    }
    return category;
}

async function getVendor(link) {
    console.log('get vendor:', link.textContent.trim())
    let vendor = { name: link.textContent.trim() };
    vendor.data = [];
    let rsp = await request.get(link.href);
    let window = new JSDOM(rsp.body).window;
    let document = window.document;
    let products = document.getElementsByClassName('Introduce_Info_Model')
    for (let i = 0; i < products.length; i++) {
        let product = products[i].getElementsByTagName('a')[0];
        vendor.data.push(await getProduct(product));
    }        
    return vendor;
}

async function getProduct(link) {
    console.log('get product:', link.textContent.trim())
    let product = { name: link.textContent.trim() };
    product.data = [];
    let rsp = await request.get(link.href);
    let mat = rsp.body.toString().match(/ClickMainMeun\(1,'(\d+)','(\d+)'/)

    let id1 = mat[1]
    let id2 = mat[2]

    let url = `http://www.zycg.gov.cn/td_xxlcpxygh/sales?FDItemCode=${id1}&FDProductID=${id2}`;
    rsp = await request.get(url);
    let window = new JSDOM(rsp.body).window;
    let document = window.document;
    document.body.innerHTML = rsp.body.toString();
    let tb = document.getElementsByClassName('gys_bj')[0];
    let trs = tb.getElementsByTagName('tr');
    for (let i = 1; i < trs.length; i++) {
        if (!trs[i].getElementsByTagName('td')[4]) {
            console.log(trs[i].getElementsByTagName('td')[0].textContent);
            continue;
        }
        let name = trs[i].getElementsByTagName('td')[4].textContent.trim();
        let supplier = await getSupplier(id1, id2, name);
        if (!supplier) continue;
        supplier.buyer = trs[i].getElementsByTagName('td')[1].textContent;
        supplier.count = trs[i].getElementsByTagName('td')[2].textContent;
        supplier.price = trs[i].getElementsByTagName('td')[3].textContent;
        supplier.date = trs[i].getElementsByTagName('td')[5].textContent;
        product.data.push(supplier);
    }
    return product;
}

async function getSupplier(id1, id2, name) {
    console.log('get supplier:', name)
    let supplier = { name };

    let supplierLink = await getSupplierLink(id1, id2, name);
    if (!supplierLink) return null;
    let supId = supplierLink.href.match(/\d+/)[0];
    supplier = Object.assign(supplier, await getSupplierDetail(supId));
    return supplier;
}

async function getSupplierDetail(id) {
    if (__suppliers[id]) return __suppliers[id]
    let url = `http://www.zycg.gov.cn/gys_zs/gys_basic_info?GetWay=Ajax&id=${id}`;
    let rsp = await request.get(url);
    let window = new JSDOM(rsp.body).window;
    let document = window.document;
    document.body.innerHTML = rsp.body.toString()
    let titles = document.getElementsByClassName('InfoTitle');
    let contents = document.getElementsByClassName('InfoContent');
    titles = Array.from(titles).map(t => t.textContent);

    let data = {};
    let keys = {
        '联系人:': 'person',
        '联系电话:': 'phone',
        '传真:': 'fax',
        '电子邮件:': 'email',
        '详细地址:': 'address'
    };
    for (let i = 0; i < Object.keys(keys).length; i++) {
        if (titles.indexOf(Object.keys(keys)[i]) < 0) {
            console.log(Object.keys(keys)[i], 'detail get failed:', id)
            continue;
        }
        data[keys[Object.keys(keys)[i]]] = contents[titles.indexOf(Object.keys(keys)[i])].textContent;
    }
    __suppliers[id] = data;
    return data;
}

async function getSupplierLink(id1, id2, name) {
    let url = `http://www.zycg.gov.cn/td_xxlcpxygh/gys_info?FDItemCode=${id1}&FDProductID=${id2}`;
    let rsp = await request.get(url);
    let window = new JSDOM(rsp.body).window;
    let document = window.document;
    document.body.innerHTML = rsp.body.toString();
    let provinces = Array.from(document.getElementsByClassName('gys_px')[0].getElementsByTagName('font'));
    let prov = provinces.find(p => name.indexOf(p.textContent) >= 0)

    let link = null;
    if (prov != null) {
        if (prov.textContent != '北京') {
            let js = prov.getAttribute('onclick');
            let idMat = js.match(/SelectProvinse=(\d+)/);
            if (!idMat) {
                console.log(prov.textContent, ' id cannot get');
                return link;
            }
            let provId = idMat[1];
            let url = `http://www.zycg.gov.cn/td_xxlcpxygh/gys_info?FDItemCode=${id1}&FDProductID=${id2}&SelectProvinse=${provId}`;
            rsp = await request.get(url);
            window = new JSDOM(rsp.body).window;
            document = window.document;
            document.body.innerHTML = rsp.body.toString();
        }
    }
    else {
        document = null;
        for (let i = 3; i < provinces.length; i++) {
            prov = provinces[i];
            let js = prov.getAttribute('onclick');
            let idMat = js.match(/SelectProvinse=(\d+)/);
            if (!idMat[1]) {
                console.log(prov.textContent, ' id cannot get');
                continue;
            }
            let provId = idMat[1];
            let url = `http://www.zycg.gov.cn/td_xxlcpxygh/gys_info?FDItemCode=${id1}&FDProductID=${id2}&SelectProvinse=${provId}`;
            rsp = await request.get(url);
            if (rsp.body.toString().indexOf(name) < 0) continue;
            window = new JSDOM(rsp.body).window;
            document = window.document;
            document.body.innerHTML = rsp.body.toString();
            break;
        }
    }

    if (document == null) 
        return '';
    let tb = document.getElementsByClassName('gys_bj')[0];
    let trs = Array.from(tb.getElementsByTagName('tr')).slice(1);
    trs = trs.map(t => t.getElementsByTagName('a')[0]);
    link = trs.find(t => t && t.textContent.trim() == name);

    if (!link) console.log(name, ' cannot find');
    return link;
}

main();