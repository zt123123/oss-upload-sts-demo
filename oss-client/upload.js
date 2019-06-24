/**
 * 1.后端获取AccessKeyId, AccessKeySecret, SecurityToken(这三个参数必须，其参数他可选)
 * 2.向bucket服务器(<bucket>.<region>.aliyuncs.com,如： nodeveloper-files.oss-cn-beijing.aliyuncs.com )发送请求，参数格式如下：
  {
    'key' : 'test/files/a.jpg',//上传文件的路径与文件名
    'policy': policyBase64,//policy额外信息
    'OSSAccessKeyId': accessid, //AccessKeyId
    'success_action_status' : '200', //让服务端返回200,不然，默认会返回204
    'signature': signature,//使用AccessKeySecret 经过sha1加密算法求出签名
    'x-oss-security-token':token //SecurityToken 一定要带上这个参数，否则不能识别是sts方式上传。会报错(AccessKeyId不存在)
    }
 */

const host = 'http://xxx.oss-cn-beijing.aliyuncs.com';//bucket域名
let param = {};
const policyText = {
  "expiration": "2020-01-01T12:00:00.000Z", //设置该Policy的失效时间，超过这个失效时间之后，就没有办法通过这个policy上传文件了
  "conditions": [
    ["content-length-range", 0, 1048576000] // 设置上传文件的大小限制
  ]
};

//获取上传所需的必要参数
const getParam = () => {
  return new Promise(resolve => {
    fetch('http://localhost:9000/sts').then(res => {
      return res.json();
    }).then(data => {
      resolve(data);
    })
  })
}

//初始化请求参数
(async function initParam() {
  const res = await getParam();
  const policyBase64 = Base64.encode(JSON.stringify(policyText))
  const bytes = Crypto.HMAC(Crypto.SHA1, policyBase64, res.AccessKeySecret, { asBytes: true });
  const signature = Crypto.util.bytesToBase64(bytes);

  param = {
    'key': 'test/files/a.jpg',//上传文件的路径与文件名
    'policy': policyBase64,//policy额外信息
    'OSSAccessKeyId': res.AccessKeyId, //AccessKeyId
    'success_action_status': '200', //让服务端返回200,不然，默认会返回204
    'signature': signature,//使用AccessKeySecret 经过sha1加密算法求出签名
    'x-oss-security-token': res.SecurityToken //SecurityToken 一定要带上这个参数，否则不能识别是sts方式上传。会报错(AccessKeyId不存在)
  }
})()

function set_upload_param(up, filename, ret) {
  up.setOption({
    'url': host,
    'multipart_params': param
  });

  up.start();
}

var uploader = new plupload.Uploader({
  runtimes: 'html5,flash,silverlight,html4',
  browse_button: 'selectfiles',
  //multi_selection: false,
  container: document.getElementById('container'),
  flash_swf_url: 'lib/plupload-2.1.2/js/Moxie.swf',
  silverlight_xap_url: 'lib/plupload-2.1.2/js/Moxie.xap',
  url: 'http://oss.aliyuncs.com',

  init: {
    PostInit: function () {
      document.getElementById('ossfile').innerHTML = '';
      document.getElementById('postfiles').onclick = function () {
        set_upload_param(uploader, '', false);
        return false;
      };
    },

    FilesAdded: function (up, files) {
      plupload.each(files, function (file) {
        document.getElementById('ossfile').innerHTML += '<div id="' + file.id + '">' + file.name + ' (' + plupload.formatSize(file.size) + ')<b></b>'
          + '<div class="progress"><div class="progress-bar" style="width: 0%"></div></div>'
          + '</div>';
      });
    },

    UploadProgress: function (up, file) {
      var d = document.getElementById(file.id);
      d.getElementsByTagName('b')[0].innerHTML = '<span>' + file.percent + "%</span>";
      var prog = d.getElementsByTagName('div')[0];
      var progBar = prog.getElementsByTagName('div')[0]
      progBar.style.width = 2 * file.percent + 'px';
      progBar.setAttribute('aria-valuenow', file.percent);
    },

    FileUploaded: function (up, file, info) {
      if (info.status == 200) {
        document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = 'upload success!!!';
      }
      else {
        document.getElementById(file.id).getElementsByTagName('b')[0].innerHTML = 'upload failed!!!';
      }
    },

    Error: function (up, err) {
      document.getElementById('console').appendChild(document.createTextNode("\nError xml:" + err.response));
    }
  }
});

uploader.init();


