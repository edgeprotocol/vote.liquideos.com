/* eslint-disable */
var invalidPrototcolRegex = /^(%20|\s)*(javascript|data)/im;
var ctrlCharactersRegex = /[^\x20-\x7E]/gmi;
var urlSchemeRegex = /^([^:]+):/gm;
var relativeFirstCharacters = ['.', '/']

function isRelativeUrl(url) {
  return relativeFirstCharacters.indexOf(url[0]) > -1;
}

function sanitizeUrl(url) {
  var urlScheme, urlSchemeParseResults;
  var sanitizedUrl = url.replace(ctrlCharactersRegex, '');

  if (isRelativeUrl(sanitizedUrl)) {
    return sanitizedUrl;
  }

  urlSchemeParseResults = sanitizedUrl.match(urlSchemeRegex);
  if (!urlSchemeParseResults) {
    return 'about:blank';
  }

  urlScheme = urlSchemeParseResults[0];
  if (invalidPrototcolRegex.test(urlScheme)) {
    return 'about:blank';
  }

  return sanitizedUrl;
}

const networks = [
  {
    name: "Main Net",
    host: "node2.liquideos.com",
    port: 8888,
    chainId: "aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906",
    secured: false
  },
  {
    name: "Jungle Testnet",
    host: "dolphin.eosblocksmith.io",
    chainId: "038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca",
    port: 8888
  }
];
var defaultIndex = 0;
function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}
var networkParam = getParameterByName('network');
if (networkParam)
  defaultIndex = networkParam;
const network = networks[defaultIndex];

var eosVoter = class {
  constructor() {
    this.network = {
      blockchain: 'eos',
      host: network.host,
      port: network.port,
      chainId: network.chainId,
      expireInSeconds: 120,
    }
    this.eos = null;
    document.getElementById("cleos_name").onkeyup = this.updateAccountName;
  }

  addTd(text) {
    var td = document.createElement('td');
    td.innerHTML = text;
    return td;
  }

  vote(errorHandler, successHandler) {
    console.log(this.network);
    document.getElementById("vote_button").disabled = true;
    this.verifyScatter();
    this.working = true;
    return this.eos.transaction(tr => {
      //	tr.delegatebw(accountName,accountName,"0.5 SYS","0.5 SYS",0);
      var accountName = document.getElementById("cleos_name").value;
      // return this.eos.contract('eosio').then(contract => {
      // return contract.voteproducer(accountName,"",this.getSelectedBPs());

      return tr.voteproducer(accountName, "", this.getSelectedBPs());

    }).then(res => {
      document.getElementById("vote_button").disabled = false;
      this.voteSuccess(res);
      this.working = false;
    }).catch(error => {
      document.getElementById("vote_button").disabled = false;
      this.voteError(error);
      this.working = false;
    });
  }

  getSelectedBPs() {
    var selected = [];
    document.getElementsByName("bpVote").forEach(function (bp) {
      if (bp.checked)
        selected.push(bp.value);
    });
    selected.sort();
    if (selected.length > 30) {
      var msg = '<div class="alert alert-danger"> Too many block producers in vote (maximum 30)</div>';
      document.getElementById("messages").innerHTML = msg;
      document.getElementById("vote_button").disabled = true;
    }
    else {
      document.getElementById("messages").innerHTML = '';
      if (!this.working)
        document.getElementById("vote_button").disabled = false;
    }
    return selected;
  }

  updateAccountName() {
    document.getElementById("cleos_account").innerHTML = document.getElementById("cleos_name").value;
    document.getElementById("cleos_account2").innerHTML = document.getElementById("cleos_name").value;
  }

  bpClick() {
    var bps = voter.getSelectedBPs();
    document.getElementById("cleos_bps").innerHTML = bps.join(" ");
  }

  voteSuccess(res) {
    //otodo
    console.log(res);
    var msg = '<div class="alert alert-success">' + "Vote Successfully Submitted" + '</div>';
    document.getElementById("messages").innerHTML = msg;
  }

  voteError(res) {
    //otodo
    console.log(res);
    var msg = '<div class="alert alert-danger">' + res.message + '</div>';
    document.getElementById("messages").innerHTML = msg;
  }

  populateBPs() {
    // populate producer table
    return this.eosPublic.getTableRows({
      "json": true,
      "scope": 'eosio',
      "code": 'eosio',
      "table": "producers",
      "limit": 500
    });
  }

  refreshBPs() {
    var eosOptions = {};
    var table;

    var config = {
      chainId: network.chainId, // 32 byte (64 char) hex string          
      expireInSeconds: 60,
    };
    if (network.secured) {
      config.httpsEndpoint = 'https://' + network.host + ':' + network.port;
    }
    else {
      config.httpEndpoint = 'http://' + network.host + ':' + network.port;
    }

    this.eosPublic = new Eos(config);
    this.populateBPs().then(res => {
      this.buildTable(res);
    });

  }

  verifyScatter() {
    this.scatter = window.scatter;
    this.scatter.requireVersion(3.0);
  }

  buildTable(res) {
    var table = document.getElementsByTagName('tbody')[0];
    const promoted = 'eosliquideos';
    this.countTotalVotes(res);
    var sorted = res.rows.sort((a, b) => a.owner === promoted ? -1 : b.owner === promoted ? 1 : Number(a.total_votes) > Number(b.total_votes) ? -1 : 1);

    for (var i = 0; i < sorted.length; i++) {
      var row = sorted[i];
      var rowSanitized = sanitizeUrl(row.url);
      var tr = document.createElement('tr');
      table.append(tr);
      tr.append(this.addTd('<input name="bpVote" type="checkbox" value="' + row.owner + '" ' + (row.owner === promoted ? 'checked' : '') + ' >'));
      tr.append(this.addTd("<a href='" + rowSanitized + "'>" + row.owner + "</a>"));
      // tr.append(this.addTd(row.location));    
      tr.append(this.addTd(this.cleanNumber(row.total_votes)));
      tr.append(this.addTd(this.createProgressBar(this.cleanPercent(this.voteNumber(row.total_votes) / this.votes))));
    }
    document.getElementsByName("bpVote").forEach(e => {
      e.onclick = this.bpClick;
    });
    return table;
  }

  countTotalVotes(res) {
    this.votes = 0;
    for (var i = res.rows.length - 1; i >= 0; i--) {
      this.votes += this.voteNumber(res.rows[i].total_votes);
    }
  }

  search() {
    var input, filter, table, tr, td, i;
    input = document.getElementById("search");
    filter = input.value.toUpperCase();
    table = document.getElementById("bps");
    tr = table.getElementsByTagName("tr");

    // Loop through all table rows, and hide those who don't match the search query
    for (i = 1; i < tr.length; i++) {
      td = tr[i].getElementsByTagName("td")[1];
      if (td) {
        if (td.innerHTML.toUpperCase().indexOf(filter) > -1) {
          tr[i].style.display = "";
        } else {
          tr[i].style.display = "none";
        }
      }
    }
  }

  voteNumber(total_votes) {
    return parseInt(parseInt(total_votes) / 1e10 * 1.4);
  }
  cleanNumber(num) {
    num = this.voteNumber(num);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }
  createProgressBar(pct) {
    return '<div class="progress-bar active float-left" role="progressbar" style="width:' + pct + '">&nbsp;</div>' +
      '<span class="text-dark current-value">' + pct + '</span>';
  }
  cleanPercent(num) {
    return Math.round(num * 10000) / 100 + "%";
  }

  timeDifference(previous) {
    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;

    var elapsed = (new Date().getTime()) - previous;

    if (elapsed < msPerMinute) {
      return Math.round(elapsed / 1000) + ' seconds ago';
    }

    else if (elapsed < msPerHour) {
      return Math.round(elapsed / msPerMinute) + ' minutes ago';
    }

    else if (elapsed < msPerDay) {
      return Math.round(elapsed / msPerHour) + ' hours ago';
    }

    else if (elapsed < msPerMonth) {
      return 'approximately ' + Math.round(elapsed / msPerDay) + ' days ago';
    }

    else if (elapsed < msPerYear) {
      return 'approximately ' + Math.round(elapsed / msPerMonth) + ' months ago';
    }

    else {
      return 'approximately ' + Math.round(elapsed / msPerYear) + ' years ago';
    }
  }
  load() {
    this.verifyScatter();
    return scatter.suggestNetwork(this.network).then((selectedNetwork) => {
      console.log("selectedNetwork", selectedNetwork);
      const requiredFields = { accounts: [{ blockchain: 'eos', host: network.host, port: network.port }] };
      this.eos = this.scatter.eos(this.network, Eos, {}, network.secured ? 'https' : undefined);
      //scatter.authenticate().then(()=>{
      return scatter.getIdentity(requiredFields).then(identity => {
        console.log("identity", identity);
        if (identity.accounts.length === 0) return
        var accountName = identity.accounts[0].name;

        document.getElementById("cleos_name").value = accountName;
        this.updateAccountName();
      });
      //  });
    });
  }
}


var voter = new eosVoter();
document.getElementById("vote_button").addEventListener('click', function () {
  voter.vote()
});
document.addEventListener('scatterLoaded', scatterExtension => {
  voter.load();
});
voter.refreshBPs();

