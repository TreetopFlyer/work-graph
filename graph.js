/** @import * as TYPES from "./graph.d.ts" */
import * as FSAccess from "./store-directory-handle.js";

export const noop = "no-op";

/** @type {TYPES.GraphBuilder} */
export function Room({user, role, part, desk, pass})
{

// mutate users
    /** @type {Record<string, TYPES.User>} */
    //@ts-ignore
    const UserList = user;
    for(let userId in user)
    {
        const name = user[userId];

        UserList[userId] = {name, id:userId, desk:new Set()};
    }

// mutate roles
    /** @type {Record<string, TYPES.Role>} */
    //@ts-ignore
    const RoleList = role;
    for(let roleId in role)
    {
        const [name, ...userIds] = role[roleId];
        RoleList[roleId] = {name, id:roleId, user:userIds.map(uId=>UserList[/**@type{string}*/(uId)])};
    }

// mutate parts
    /** @type {Record<string, TYPES.Part>} */
    //@ts-ignore
    const PartList = part;
    for(let partId in part)
    {
        const [name, loop] = part[partId];

        PartList[partId] = /** @type {TYPES.Part} */({name, id:partId, need:[], make:[], pass:new Map(), loop:loop});
    }

// mutate desks
    /** @type {Record<string, TYPES.Desk>} */
    //@ts-ignore
    const DeskList = desk;
    for(let deskId in desk)
    {
        const [name, roleIDs, needObj, ...makePartIDs] = desk[deskId];
        /** @type {TYPES.Part[]}*/ const need =[];
        /** @type {number[]}*/ const time =[];

        /** @type {TYPES.Desk} */
        const deskObj = {
            name,
            id:deskId,
            need,
            time,
            make:[],
            role:[],
            pass:new Map()
        };

        for(const partId in needObj)
        {   
            const part = PartList[partId];
            need.push(part);
            part.need.push(deskObj);
            time.push(needObj[partId]);
        }

        deskObj.role = roleIDs.map(roleId=>
        {
            const role = RoleList[/**@type{string}*/(roleId)];
            role.user.forEach(u =>u.desk.add(deskObj));
            return role;
        }); 

        deskObj.make = makePartIDs.map( partId=>
        {
            const part = PartList[/**@type{string}*/(partId)];
            part.make.push(deskObj);
            return part;
        } )

        DeskList[deskId] = deskObj;
    }

// Apply passes
    /** @type {Record<string, TYPES.Pass>} */
    //@ts-ignore
    const PassList = pass;
    for(let passID in pass)
    {
        
        const [name, date] = pass[passID]
        /** @type {TYPES.Pass} */
        const passObj = {
            name, date,
            id:passID,
            path:passID,
            async load(){

                // make room for this pass to each part and desk
                Object.values(PartList).forEach((partObj)=>
                {
                    partObj.pass.set(passObj, {time:0, work:[], async make(user, data)
                    {
                        this.time = Date.now();

                        const handle = await FSAccess.getDirectoryHandle();
                        const path = ["store", context.Path, passID, user.id+".json"];
                        let text = await FSAccess.Read(handle, path) || "{}";
                        /** @type {TYPES.UserPassFile} */
                        const json = JSON.parse(text);

                        let field = json[partObj.id];
                        if(!field)
                        {
                            field = [];
                            json[partObj.id] = field;
                        }
                        field.push([this.time, data]);
                        text = JSON.stringify(json, null, 2);
                        await FSAccess.Write(handle, path, text);
                        
                        this.work.push(/** @type {TYPES.Work}*/([this.time, data, user]));
                        partObj.make.forEach((arg)=>{Scan(arg, passObj)});
                        partObj.need.forEach((arg)=>{Scan(arg, passObj)});
                    }});
                });
                Object.values(DeskList).forEach((deskObj)=>
                {
                    deskObj.pass.set(passObj, {need:[], make:[]});
                });
                

                // actually load the pass
                const userData = Object.entries(UserList);
                for(let i=0; i<userData.length; i++)
                {
                    const [userID, userObject] = userData[i];
                    try
                    {   
                        const handle = await FSAccess.getDirectoryHandle();
                        const text = await FSAccess.Read(handle, ["store", context.Path, passID, userID+".json"]);
                        /** @type {TYPES.UserPassFile} */
                        const json = JSON.parse(text);
                        
                        Object.entries(json).forEach(([partID, payload])=>{

                            let latest = 0;
                            payload.forEach((condensedWork)=>{
                                if(condensedWork[0] > latest)
                                {
                                    latest = condensedWork[0];
                                }
                                condensedWork[2] = userObject;
                            });

                            const passCheck = PartList[partID].pass.get(this);
                            if(passCheck)
                            {
                                if(latest > passCheck.time)
                                {
                                    passCheck.time = latest;
                                }
                                //payload.sort()
                                passCheck.work = /** @type {TYPES.Work[]}*/(payload);
                            }

                        })
                    }
                    catch(e)
                    {
                        console.warn(`No data for user ${userID} on pass ${passID} yet.`)
                        continue;
                    }

                }

                // update the graph
                Object.values(DeskList).forEach((deskObj)=>Scan(deskObj, passObj));

                this.live = true;
            },
            dump(){
                Object.values(PartList).forEach((partObj)=>partObj.pass.delete(passObj));
                Object.values(DeskList).forEach((deskObj)=>deskObj.pass.delete(passObj));
                this.live = false;
            },
            live:false
        };

        PassList[passID] = passObj;
    }

    const context = {
        Path:"",
        Desk:DeskList,
        Part:PartList,
        User:UserList,
        Role:RoleList,
        Pass:PassList
    }

    return context;
}

/** @type {TYPES.MassBuilder} */
export default function MassBuild(params)
{
    Object.entries(params).forEach( ([roomFolderName, roomData])=>
    {
        roomData.Path = roomFolderName;
    });
    globalThis.BuildResults = params;
}

/** @type {TYPES.Scanner} */
const Scan =(desk, pass)=>
{
    const dirtyNeed = [];
    const dirtyMake = [];

    const emptyNeed = [];
    const emptyMake = [];

    let makeMin = Infinity;
    let needMax = -Infinity;
    
    // added for estimation
    let estMin = Infinity;
    let estMax = -Infinity;
    let estSum = 0;

/*

Loop parts:
- always considered clean when the leading value is a no-op
- as a need, considered clean when empty

*/

    /** @type {(part:TYPES.Part)=>[time:number, value:string|undefined, part:TYPES.Part]} */
    const lookup =(part)=>
    {
        const partPass = part.pass.get(pass);
        const partPassTime = partPass?.time || 0;
        const partPassValue = partPass?.work.find(t=>t[0] == partPassTime)?.[1];
        return [partPassTime, partPassValue, part];
    }

    // update needMax
    for(let i=0; i<desk.need.length; i++)
    {
        const [time, value, part] = lookup(desk.need[i]);

        if(part.loop)
        {
            if(!value || value == noop)
            {
                continue;
            }
        }

        if(time > needMax) needMax = time;
        if(!time) emptyNeed.push(i);
    }

    // update makeMin AND dirtyMakes
    for(let i=0; i<desk.make.length; i++)
    {
        const [time] = lookup(desk.make[i]);

        if(time < makeMin) makeMin = time;
        if(time < needMax) dirtyMake.push(i);
        if(!time) emptyMake.push(i) 

    }

    // dirtyNeeds
    for(let i=0; i<desk.need.length; i++)
    {
        const [time, value, part] = lookup(desk.need[i]);

        if(part.loop)
        {
            if(!value || value == noop)
            {
                continue;
            }
        }

        if(time > makeMin)
        {
            dirtyNeed.push(i);

            // estimation
            if(time < estMin) estMin = time;
            const allottedTime = desk.time[i] * 1000 * 60 * 60;
            const projectedTime = time + allottedTime;
            estSum += allottedTime;
            if(projectedTime > estMax) estMax = projectedTime;
        }
    }
    
    estSum += estMin;
    let stamp = estSum;
    if(estMax > estSum)
    {
        stamp = estMax;
    }

    if(desk.need.length === 0)
    {
        stamp = pass.date;
    }

    desk.pass.set(pass, {need_dirty:dirtyNeed, make_dirty:dirtyMake, need_empty:emptyNeed, make_empty:emptyMake, due_date:isFinite(stamp) ? new Date(stamp) : undefined})
};

globalThis.Setup = MassBuild;
globalThis.Room = Room;
globalThis.BuildResults = {};