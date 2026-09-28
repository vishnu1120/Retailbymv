import React, { useEffect, useState } from "react";
import { T } from "../../constants/theme";
import Card from "../common/Card";
import Btn from "../common/Btn";
import Field from "../common/Field";
import Input from "../common/Input";
import Select from "../common/Select";

const KEY="erp_local_users";
export default function UserManagement(){
  const [users,setUsers]=useState(()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}});
  const [form,setForm]=useState({name:"",userId:"",email:"",role:"shop_user"});
  useEffect(()=>localStorage.setItem(KEY,JSON.stringify(users)),[users]);
  const add=()=>{if(!form.name.trim()&&!form.email.trim())return;setUsers(u=>[...u,{...form,id:Date.now(),active:true}]);setForm({name:"",userId:"",email:"",role:"shop_user"})};
  return <div style={{display:"flex",flexDirection:"column",gap:16}}><div style={{fontWeight:700,fontSize:16}}>User Accounts</div><Card><div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr)) auto",gap:10,alignItems:"end"}}><Field label="Name"><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></Field><Field label="User ID"><Input value={form.userId} onChange={e=>setForm({...form,userId:e.target.value})}/></Field><Field label="Email"><Input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label="Role"><Select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="shop_user">Shop User</option><option value="shop_admin">Shop Admin</option></Select></Field><Btn onClick={add}>Add User</Btn></div></Card><Card><div style={{fontWeight:700,marginBottom:10}}>Local Users</div>{users.length===0?<div style={{color:T.muted}}>No additional users.</div>:users.map(u=><div key={u.id} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.border}`}}><span>{u.name||u.email} · {u.role}</span><button onClick={()=>setUsers(x=>x.filter(a=>a.id!==u.id))}>Remove</button></div>)}</Card></div>;
}
