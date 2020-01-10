const request = require('request-promise').defaults({
    jar: true,
    simple: false,
    resolveWithFullResponse: true
});
const urlencode = require('urlencode');
const iconv = require('iconv-lite');

function sleep(second) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, second * 1000);
    })
}

module.exports.get = async function (url, encoding = 'utf-8') {
    if (url.indexOf('http') < 0) url = 'http://www.zycg.gov.cn' + url;

    url = encodeURI(url);
    url = url.replace(/%2526/, '%26');

    let options = {
        url: url,
        encoding: null
    };

    let rsp;
    try {
        rsp = await request.get(options);
        if (rsp.statusCode >= 400) {
            await sleep(1);
            rsp = await request.get(options);
            if (!rsp || rsp.statusCode >= 400)
                throw (new Error('访问失败！'));
        }
    } catch (error) {
        await sleep(1);
        rsp = await request.get(options);
        if (!rsp || rsp.statusCode >= 400)
            throw (new Error('访问失败！'));
    }

    rsp.body = typeof rsp.body == 'string' ? iconv.decode(rsp.body, encoding) : rsp.body;
    return rsp;
};

module.exports.post = async function (url, formData, encoding = 'utf-8') {
    let options = {
        url: url,
        form: formData,
        encoding: null
    };

    let rsp = await request.post(options);
    if (!rsp || rsp.statusCode >= 400) {
        throw (new Error('访问失败！'));
    }

    rsp.body = typeof rsp.body == 'string' ? iconv.decode(rsp.body, encoding) : rsp.body;

    return rsp;
};

module.exports.json = async function (url, json) {
    let options = {
        url: url,
        json: true,
        encoding: null,
        body: json
    };

    let rsp = await request.post(options);
    if (!rsp || rsp.statusCode >= 400) {
        throw (new Error('访问失败！'));
    }

    return rsp;
};

module.exports.toFormData = function (obj, encoding) {
    let data = '';
    for (let k in obj) {
        let val = obj[k].toString().match(/^\w+$/) ? obj[k] : urlencode(obj[k], encoding);
        data += '&' + k + '=' + val;
    }
    return data.replace(/^&+/, '');
};

module.exports.send = request;