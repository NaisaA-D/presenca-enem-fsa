export const STAGES = { initial: 'Manhã', afternoon: 'Tarde' };
export const afternoonUnlockAt = (date = '2026-11-15') => Date.parse(`${date}T15:30:00-03:00`);
export const afternoonIsOpen = (now, date = '2026-11-15') => now >= afternoonUnlockAt(date);
export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const presence = (state, id, stage) => state.attendance?.[id]?.[stage] ?? { present: false, version: 0 };
export const assignmentsFor = (state, id) => state.allocations.filter(a => a.personId === id);
export const activePeople = state => state.people.filter(p => p.active !== false);
export const plannedPeople = state => activePeople(state).filter(p => assignmentsFor(state, p.id).length);
export function schoolStats(state, school, stage) {
  const allocations = state.allocations.filter(a => a.schoolId === school.id);
  const collaborators = allocations.filter(a => a.role === 'collaborator');
  const coordinators = allocations.filter(a => a.role === 'coordinator');
  const arrived = collaborators.filter(a => presence(state, a.personId, stage).present).length;
  const arrivedCoordinators = coordinators.filter(a => presence(state, a.personId, stage).present).length;
  const shared = coordinators.some(a => assignmentsFor(state, a.personId).filter(x => x.role === 'coordinator').length > 1);
  return { allocations, collaborators, coordinators, arrived, arrivedCoordinators, shared,
    unassigned: Math.max(0, school.targetCollaborators - collaborators.length),
    missing: Math.max(0, school.targetCollaborators - arrived),
    coordinatorVacancies: Math.max(0, school.targetCoordinators - coordinators.length),
    complete: arrived >= school.targetCollaborators && arrivedCoordinators >= school.targetCoordinators };
}
export function totals(state, stage) {
  const people = plannedPeople(state);
  return { planned: people.length, present: people.filter(p => presence(state, p.id, stage).present).length,
    pending: people.filter(p => !presence(state, p.id, stage).present).length,
    schoolsCovered: state.schools.filter(s => schoolStats(state, s, stage).complete).length };
}
export function filterPeople(state, { query = '', city = '', role = '', status = '', stage = 'initial' } = {}) {
  return activePeople(state).filter(p => {
    const allocations = assignmentsFor(state, p.id);
    const schools = allocations.map(a => state.schools.find(s => s.id === a.schoolId)).filter(Boolean);
    return (!query || normalize([p.name, ...schools.map(s => s.name)].join(' ')).includes(normalize(query))) &&
      (!city || schools.some(s => s.city === city)) && (!role || allocations.some(a => a.role === role)) &&
      (!status || (status === 'present' ? presence(state, p.id, stage).present : status === 'reserve' ? !allocations.length : !presence(state, p.id, stage).present));
  }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
export function applyEvent(state, event) {
  if (event.action === 'add') {
    state.people.push({id:event.personId,name:event.name,note:'',active:true});
    if(event.schoolId) state.allocations.push({id:`r_${event.requestId}`,personId:event.personId,schoolId:event.schoolId,role:'collaborator'});
  } else if (event.action === 'attendance') {
    state.attendance[event.personId] ??= {};
    state.attendance[event.personId][event.stage] = { present: event.present, at: event.at, operator: event.operator, version: event.version };
  } else if (event.action === 'reassign') {
    state.allocations = state.allocations.filter(a => !(a.personId === event.personId && a.role === 'collaborator'));
    state.allocations.push({ id: `r_${event.requestId}`, personId: event.personId, schoolId: event.schoolId, role: 'collaborator' });
    state.assignmentVersions[event.personId] = event.version;
  }
  state.revision += 1;
  state.history = [...(state.history || []), event].slice(-30);
  return state;
}
export function toCsv(rows) {
  return '\ufeff' + rows.map(row => row.map(cell => {
    let value = String(cell ?? '');
    if (/^[=+\-@\t\r]/.test(value)) value = "'" + value;
    return '"' + value.replaceAll('"', '""') + '"';
  }).join(';')).join('\r\n');
}
