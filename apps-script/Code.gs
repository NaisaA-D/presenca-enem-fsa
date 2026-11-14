/** ENEM FSA — vincule este projeto à planilha criada para a ação. */
function doGet() { return output_(function(){return {state:snapshot_()};}); }
function doPost(e) { return output_(function(){
  if(!e || !e.postData || e.postData.contents.length>10000) throw Error('Requisição inválida.');
  var body=JSON.parse(e.postData.contents);
  if(body.action==='unlock'){checkCode_(body.code,'ARRIVAL');return {};}
  var lock=LockService.getScriptLock();lock.waitLock(20000);
  try{return mutate_(body);}finally{lock.releaseLock();}
}); }
function output_(fn){try{return ContentService.createTextOutput(JSON.stringify(Object.assign({ok:true},fn()))).setMimeType(ContentService.MimeType.JSON);}catch(error){return ContentService.createTextOutput(JSON.stringify({ok:false,error:error.message||'Não foi possível concluir.'})).setMimeType(ContentService.MimeType.JSON);}}
function db_(){var id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');if(!id)throw Error('Configure SPREADSHEET_ID nas propriedades do script.');return SpreadsheetApp.openById(id);}
function rows_(name){var sheet=db_().getSheetByName(name);if(!sheet)throw Error('Aba obrigatória ausente: '+name);var data=sheet.getDataRange().getValues(),header=data.shift();return data.filter(function(r){return r[0]!=='';}).map(function(r){var out={};header.forEach(function(k,i){out[k]=r[i];});return out;});}
function bool_(v){return v===true || v==='true' || v===1 || v==='TRUE';}
function snapshot_(){
  var cfg={};rows_('Config').forEach(function(r){cfg[r.chave]=String(r.valor);});
  var state={event:{name:cfg.evento,organization:cfg.organizacao,date:cfg.data,timezone:'America/Sao_Paulo'},people:[],schools:[],vans:[],allocations:[],attendance:{},assignmentVersions:{},revision:0,history:[]};
  state.people=rows_('Pessoas').filter(function(r){return bool_(r.ativo);}).map(function(r){return {id:r.id,name:r.nome,note:r.observacao||'',active:true};});
  var active={};state.people.forEach(function(p){active[p.id]=true;});
  state.schools=rows_('Escolas').map(function(r){return {id:r.id,city:r.cidade,name:r.nome,neighborhood:r.bairro,address:r.endereco,vanId:r.van_id,targetCollaborators:Number(r.meta_colab)||0,targetCoordinators:Number(r.meta_coord)||0,note:r.observacao||''};});
  state.vans=rows_('Vans').map(function(r){return {id:r.id,name:r.nome,capacity:Number(r.capacidade)||null};});
  state.allocations=rows_('Alocacoes').filter(function(r){return active[r.pessoa_id];}).map(function(r){return {id:r.id,personId:r.pessoa_id,schoolId:r.escola_id,role:r.funcao};});
  rows_('Inclusoes').forEach(function(r){state.people.push({id:r.pessoa_id,name:r.nome,note:'',active:true});active[r.pessoa_id]=true;if(r.escola_id)state.allocations.push({id:'r_'+r.request_id,personId:r.pessoa_id,schoolId:r.escola_id,role:'collaborator'});state.history.push({action:'add',personId:r.pessoa_id,operator:r.operador,at:String(r.data_hora),requestId:r.request_id});state.revision++;});
  rows_('Historico').forEach(function(r){
    if(!active[r.pessoa_id])return;
    var event={at:r.data_hora instanceof Date?r.data_hora.toISOString():String(r.data_hora),requestId:r.request_id,action:r.acao,personId:r.pessoa_id,stage:r.periodo,present:bool_(r.presente),operator:r.operador,schoolId:r.escola_id,reason:r.motivo,version:Number(r.versao)};
    if(event.action==='attendance'){state.attendance[event.personId]=state.attendance[event.personId]||{};state.attendance[event.personId][event.stage]={present:event.present,at:event.at,operator:event.operator,version:event.version};}
    else if(event.action==='reassign'){state.allocations=state.allocations.filter(function(a){return !(a.personId===event.personId&&a.role==='collaborator');});state.allocations.push({id:'r_'+event.requestId,personId:event.personId,schoolId:event.schoolId,role:'collaborator'});state.assignmentVersions[event.personId]=event.version;}
    state.revision++;state.history.push(event);
  });state.history=state.history.sort(function(a,b){return new Date(a.at)-new Date(b.at);}).slice(-30);return state;
}
function text_(v,min,max){if(typeof v!=='string'||v.trim().length<min||v.length>max)throw Error('Preencha nome e motivo corretamente.');return v.trim();}
function safeCell_(s){return /^[=+\-@\t\r]/.test(s)?"'"+s:s;}
function digest_(s){return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s,Utilities.Charset.UTF_8));}
function checkCode_(code,type){
  var props=PropertiesService.getScriptProperties(),salt=props.getProperty('CODE_SALT'),expected=props.getProperty(type+'_HASH');
  if(!salt||!expected)throw Error('O código de acesso ainda não foi configurado pela organização.');
  var actual=digest_(salt+':'+String(code||'')),diff=actual.length^expected.length;
  for(var i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^actual.charCodeAt(i);
  if(diff!==0)throw Error('Código incorreto.');
}
function mutate_(body){
  if(['attendance','reassign','add'].indexOf(body.action)<0)throw Error('Ação inválida.');
  if(body.action==='attendance'){
    if(['initial','afternoon'].indexOf(body.stage)<0||typeof body.present!=='boolean')throw Error('Período ou presença inválido.');
    if(body.stage==='initial'||!body.present)checkCode_(body.code,'ARRIVAL');
  }else checkCode_(body.code,body.action==='add'?'ARRIVAL':'ADMIN');
  var request=text_(body.requestId,16,80);if(!/^[a-zA-Z0-9_-]+$/.test(request))throw Error('Identificador inválido.');
  var operator=text_(body.operator,2,80),state=snapshot_();
  if(body.action==='add')return addPerson_(body,request,operator,state);
  var person=state.people.find(function(p){return p.id===body.personId;});if(!person)throw Error('Participante não encontrado ou inativo.');
  var previous=rows_('Historico').find(function(r){return r.request_id===request;});
  if(previous){if(previous.pessoa_id!==body.personId||previous.acao!==body.action||previous.operador!==safeCell_(operator)||previous.periodo!==(body.stage||'')||(body.action==='attendance'&&bool_(previous.presente)!==body.present)||(body.action==='reassign'&&previous.escola_id!==body.schoolId))throw Error('Identificador já usado para outra alteração.');return {state:state,repeated:true};}
  var version=0,school='',reason='';
  if(body.action==='attendance'){version=((state.attendance[person.id]||{})[body.stage]||{}).version||0;}
  else{
    if(state.allocations.some(function(a){return a.personId===person.id&&a.role==='coordinator';}))throw Error('Realocação de coordenador deve ser feita pela organização na escala.');
    if(!state.schools.some(function(s){return s.id===body.schoolId;}))throw Error('Escola de destino inválida.');
    school=body.schoolId;reason=text_(body.reason,3,200);version=state.assignmentVersions[person.id]||0;
  }
  if(!Number.isInteger(body.version)||body.version!==version)throw Error('Este registro foi alterado por outra pessoa. Atualize a página antes de continuar.');
  db_().getSheetByName('Historico').appendRow([new Date().toISOString(),request,body.action,person.id,body.stage||'',body.action==='attendance'?body.present:'',safeCell_(operator),school,safeCell_(reason),version+1]);
  SpreadsheetApp.flush();
  var next=snapshot_();try{refreshViews_(next);}catch(error){console.error('Histórico salvo; atualização da visão pendente: '+error.message);}
  return {state:next};
}
function refreshViews_(state){
  var attendance=[['pessoa_id','nome','inicial','tarde','inicial_em','tarde_em','escolas']];
  state.people.forEach(function(p){var a=state.attendance[p.id]||{},initial=a.initial||{},afternoon=a.afternoon||{};attendance.push([p.id,p.name,initial.present?'Sim':'Pendente',afternoon.present?'Sim':'Pendente',initial.at||'',afternoon.at||'',state.allocations.filter(function(x){return x.personId===p.id;}).map(function(x){return state.schools.find(function(s){return s.id===x.schoolId;}).name;}).join(' / ')]);});
  var allocation=[['pessoa_id','nome','escola','cidade','funcao']];state.allocations.forEach(function(a){var p=state.people.find(function(p){return p.id===a.personId;}),s=state.schools.find(function(s){return s.id===a.schoolId;});if(p&&s)allocation.push([p.id,p.name,s.name,s.city,a.role]);});
  var collaborators=[['Nome','Função','Escola','Cidade','Presença inicial','Presença tarde','Incluído por']],coordinators=[collaborators[0].slice()];
  var inclusions=rows_('Inclusoes');
  state.people.forEach(function(p){var alloc=state.allocations.filter(function(a){return a.personId===p.id;}),isCoordinator=alloc.some(function(a){return a.role==='coordinator';}),a=state.attendance[p.id]||{},schools=alloc.map(function(x){return state.schools.find(function(s){return s.id===x.schoolId;});}),origin=inclusions.find(function(i){return i.pessoa_id===p.id;});var row=[p.name,isCoordinator?'Coordenador(a)':'Colaborador(a)',schools.map(function(s){return s.name;}).join(' / '),schools.map(function(s){return s.city;}).filter(function(c,i,all){return all.indexOf(c)===i;}).join(' / '),(a.initial||{}).present?'Sim':'Pendente',(a.afternoon||{}).present?'Sim':'Pendente',origin?origin.operador:'Pré-cadastro'];(isCoordinator?coordinators:collaborators).push(row);});
  [['Presencas',attendance],['AlocacoesAtual',allocation],['Colaboradores',collaborators],['Coordenadores',coordinators]].forEach(function(pair){var sheet=db_().getSheetByName(pair[0]);sheet.clearContents();sheet.getRange(1,1,pair[1].length,pair[1][0].length).setValues(pair[1]);});
}
/** Execute uma vez, no editor, para definir os dois códigos. Nunca publique os códigos. */
function configurarCodigos(){
  var ui=SpreadsheetApp.getUi();var arrival=ui.prompt('Código de chegada','Defina exatamente 4 dígitos numéricos.',ui.ButtonSet.OK_CANCEL);if(arrival.getSelectedButton()!==ui.Button.OK)return;
  var admin=ui.prompt('Código de administração','Use um código diferente, com pelo menos 12 caracteres.',ui.ButtonSet.OK_CANCEL);if(admin.getSelectedButton()!==ui.Button.OK)return;
  var a=arrival.getResponseText(),b=admin.getResponseText();if(!/^[0-9]{4}$/.test(a)||b.length<12||a===b)throw Error('Use 4 dígitos na chegada e pelo menos 12 caracteres na administração. Nenhuma alteração salva.');
  var salt=Utilities.getUuid();PropertiesService.getScriptProperties().setProperties({CODE_SALT:salt,ARRIVAL_HASH:digest_(salt+':'+a),ADMIN_HASH:digest_(salt+':'+b)});ui.alert('Códigos definidos. Compartilhe apenas o código de chegada com a equipe de recepção.');
}
function atualizarVisoes(){refreshViews_(snapshot_());}
function normalized_(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
function addPerson_(body,request,operator,state){
  var name=text_(body.name,5,120),school=body.schoolId||'';
  if(!/^[\p{L}]/u.test(name))throw Error('O nome deve começar com uma letra.');
  if(school&&!state.schools.some(function(s){return s.id===school;}))throw Error('Escola inválida.');
  var prior=rows_('Inclusoes').find(function(r){return r.request_id===request;});
  if(prior){if(prior.nome!==safeCell_(name)||prior.operador!==safeCell_(operator)||prior.escola_id!==school)throw Error('Identificador já usado.');return {state:state,repeated:true};}
  var all=rows_('Pessoas').map(function(p){return p.nome;}).concat(rows_('Inclusoes').map(function(p){return p.nome;}));
  if(all.some(function(n){return normalized_(n)===normalized_(name);}))throw Error('Este nome já está cadastrado. Confira a lista de presença.');
  if(rows_('NaoAlocar').some(function(p){return normalized_(p.nome)===normalized_(name);}))throw Error('A organização precisa revisar este cadastro.');
  var id='p_'+Utilities.getUuid();
  db_().getSheetByName('Inclusoes').appendRow([new Date().toISOString(),request,id,safeCell_(name),school,safeCell_(operator)]);SpreadsheetApp.flush();
  var next=snapshot_();try{refreshViews_(next);}catch(error){console.error(error.message);}return {state:next};
}
function onOpen(){SpreadsheetApp.getUi().createMenu('Presença ENEM').addItem('Configurar códigos','configurarCodigos').addItem('Atualizar lista de presença','atualizarVisoes').addToUi();}

