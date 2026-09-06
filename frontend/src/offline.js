export const OFFLINE_KEY = "novapos.offline.queue.v26";
export const DEVICE_KEY = "novapos.device_id.v26";
export function deviceId(){
  let v=localStorage.getItem(DEVICE_KEY);
  if(!v){v=crypto.randomUUID?.()||`device-${Date.now()}-${Math.random().toString(16).slice(2)}`;localStorage.setItem(DEVICE_KEY,v)}
  return v;
}
export function readQueue(){try{return JSON.parse(localStorage.getItem(OFFLINE_KEY)||"[]")}catch{return[]}}
export function writeQueue(q){localStorage.setItem(OFFLINE_KEY,JSON.stringify(q));return q}
export function enqueue(event){const q=readQueue();q.push({...event,local_id:event.local_id||crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,queued_at:new Date().toISOString(),status:"LOCAL_PENDING"});writeQueue(q);return q}
export function removeLocalIds(ids){const set=new Set(ids);return writeQueue(readQueue().filter(x=>!set.has(x.local_id)))}
