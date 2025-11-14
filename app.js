/** @import * as TYPES from "./graph.d.ts" */
import * as FSHandle from "./store-directory-handle.js";

import "./graph.js";

import Styles from "./styles.js";
const {DOM, Div, Tag} = Styles;

async function PickHandle()
{
    handle = await showDirectoryPicker();
    await FSHandle.setDirectoryHandle(handle);
    await LoadHandleFiles();
}
async function LoadHandleFiles()
{
    console.log("fetching setup.js", handle);
    if(handle)
    {
        try
        {
            await import("./user-data/setup.js"+"?bust="+Math.random());
            /** @type {Record<string, TYPES.GraphParts>} */
            const read = BuildResults;

            for(const roomKey in read)
            {
                const room = read[roomKey]
                for(const pass in room.Pass)
                {
                    await room.Pass[pass].load();
                }
            }

            rooms.val = read;
        }
        catch(e)
        {
            console.log("the handle exists, but the request failed. the service work must not be ready yet.", e)
            rooms.val = {};
        }
    }
    else
    {
        console.log("no fs handle has been set, cannot get room graph")
        rooms.val = {};
    }
}



/** @type {Van.State<Record<string, TYPES.GraphParts>>} */
const rooms = van.state({});
let handle = await FSHandle.getDirectoryHandle();
await LoadHandleFiles();


/** @type {Van.State<string>} */
const loggedIn = van.state("", "login");

/** @type {TYPES.User|false} */
let realUser = false;

const blocking = van.state(false);

const showDesks = van.state(true, "desks");

/** @type {(inParts:Record<string, TYPES.Part>, inPasses:Record<string, TYPES.Pass>)=>HTMLElement} */
function Parts(inParts, inPasses)
{
    const rows = [];
    
    const row = [DOM.th()]
    for(const pass in inPasses)
    {
        row.push(DOM.th(inPasses[pass].name));
    }
    rows.push(DOM.thead(row));

    Object.entries(inParts).map(([part_id, part])=>{

        const row = [DOM.th(part.name)];
        for(const [pass, data] of part.pass)
        {
            row.push(DOM.td.Part(data.work.map(w=>Div.Plain(w[1]) )))
        }
        rows.push(DOM.tr(row))
    });

    return DOM.table.GapVertical(rows);
}

//const deskRender = van.state(0);

/** @type {(part:TYPES.Part, pass:TYPES.Pass, closeHandler:(parent:HTMLElement)=>void, historyOnly:boolean)=>HTMLElement} */
function PartEditor(part, pass, closeHandler, historyOnly=false)
{
    const partPass = part.pass?.get(pass);

    const hist = van.state(false);
    const edit = van.state(false);

    const upper = ()=>{
        if(partPass?.work.length)
        {
            return DOM.div(
                DOM.button(
                    {
                        onclick()
                        {
                            hist.val=!hist.val;
                        }
                    }, ()=>(hist.val ? "hide" : "show")+" changes"
                ),
                hist.val ? partPass.work.map(w=>{
                    const date = new Date(w[0]);
                    return DOM.div(`${date.getMonth()}/${date.getDate()}`, DOM.strong(w[1]), w[2].name);
                }) : ""
            );
        }
        else
        {
            return "";
        }
    }

    for(const n of part.need)
    {
        for(const r of n.role)
        {
            for(const u of r.user)
            {
                if(u.id == loggedIn.rawVal)
                {
                    break;
                }
            }
        }
    }

    const lower = ()=>
    {
        return DOM.div(
            ()=>{
                return loggedIn.rawVal ? DOM.button(
                    {onclick(){edit.val = !edit.val;}},
                    ()=>(edit.val ? "cancel" : "make") + " changes"
                ) : DOM.p("log in to make changes")
            },
            ()=>{
                const textarea = DOM.textarea()
                return edit.val ? DOM.div(
                    textarea,
                    DOM.button({
                        onclick(){
                            if(realUser && partPass)
                            {
                                blocking.val = true;
                                partPass.make(realUser, textarea.value).then(()=>{
                                    blocking.val = false;
                                    //deskRender.val++;
                                })
                            }
                            else
                            {
                                return false;
                            }
                        }
                    }, "save changes")
                ) : ""
            }
        )
    }

    const self = DOM.div(
        upper,
        ()=>DOM.button({onclick(e){e.stopPropagation(); closeHandler(self)}}, "close"),
        DOM.div(
            ()=>{
                if(partPass)
                {
                    return partPass.work.find((w)=>w[0] == partPass.time)?.[1] || ""
                }
                return "(no data yet)";
            }
        ),
        historyOnly ? "" : lower,
    );

    return self;
}

/** @type {(className:string, value:string|undefined, part:TYPES.Part, pass:TYPES.Pass, historyOnly:boolean)=>HTMLElement} */
function PartCell(className, value, part, pass, historyOnly=false)
{
    const attr = "data-editing";

    /** @type {(editor:HTMLElement)=>void} */
    function close(editor){
        editor.remove();
        self.innerHTML = value||"";
        self.setAttribute(attr, "false");
    }   

    /** @type {(this:HTMLElement)=>void} */
    function onclick()
    {    
        const check = self.getAttribute(attr);
        if(check !== "true")
        {
            self.innerHTML = "";
            self.setAttribute(attr, "true");
            self.appendChild(PartEditor(part, pass, close, historyOnly));
        }
    }
    
    const self = Div.Part(
        {
            onclick,
            class: className
        },
        value
    )

    return DOM.td(self);
}

/** @type {(inDesks:Record<string, TYPES.Desk>)=>HTMLElement} */
function Desks(inDesks)
{
    return Div.PartGroup(
        Object.entries(inDesks).map(([desk_id, desk])=>{

            //loggedIn.val;

            //deskRender.val;
            //console.log("reredering desk", desk.name);

            if (loggedIn.val)
            {
                let userInRole = false;
                for(const role of desk.role)
                {
                    if(role.user.includes(realUser))
                    {
                        userInRole = true;
                    }
                }
                if(!userInRole)
                {
                    return null;
                }
            }


            const work = [];
            for(const [pass, scan] of desk.pass)
            {

                // at least one but not all need fields are empty
                const caution = scan.need_empty.length>0 && scan.need_empty.length<desk.need.length;


                work.push(DOM.tr(
                    DOM.td(pass.name),
                    desk.need.map((part, index, array)=>
                    {
                        const partPass = part.pass.get(pass);
                        if(!partPass){ return null }
                        const latest = partPass.work.find(t=>t[0] == partPass.time)?.[1];

                        let className = "";

                        if(latest)
                        {
                            className = Tag("PartGood")
                        }
                        else
                        {
                            className = Tag("PartEmpty")
                        }

                        if(scan.need_dirty.includes(index))
                        {
                            className = Tag("PartDirty")
                        }

                        return PartCell(className, latest, part, pass, true);
                    }),
                    DOM.td(
                        Div.Icon("⇉"),
                        scan.due_date ? Div.Part(
                            scan.due_date.toLocaleDateString(),
                            scan.due_date.toLocaleTimeString()
                        ) : " "
                    ),
                    desk.make.map((part, index, array)=>
                    {
                        const partPass = part.pass.get(pass);
                        if(!partPass){ return null }
                        const latest = partPass.work.find(t=>t[0] == partPass.time)?.[1];
                        
                        let className = "";

                        if(latest)
                        {
                            className = Tag("PartGood")
                        }
                        else
                        {
                            className = Tag("PartEmpty")
                        }

                        if( (desk.need.length==0 && !latest) || scan.make_dirty.includes(index))
                        {
                            
                            if(!latest && caution)
                            {
                                className = Tag("PartCaution")
                            }
                            else
                            {
                                className = Tag("PartDirty");
                            }
                        }   

                        return PartCell(className, latest, part, pass);

                    }),
                ))
            }

            return Div.DeskContainer(
                DOM.h3(desk.name),
                DOM.table.GapHorizontal(

                    DOM.thead(
                        DOM.tr(
                            DOM.th(),
                            desk.need.map((part)=>DOM.th(part.name)),
                            DOM.th("→"),
                            desk.make.map((part)=>DOM.th(part.name))
                        )
                    ),
                    work
                )
            )


        }),
    )
}

/** @type {(room_id:string, graphParts:TYPES.GraphParts)=>HTMLElement} */
function Room(room_id, graphParts)
{
    const rerender = van.state(0);
    blocking.val;

    return Div.Plain(

        Div.Plain("Users:"),
        Div.PartGroup(
            Object.entries(graphParts.User).map(([user_id, user])=>{

                if(loggedIn.val == user.id)
                {
                    realUser = user;
                }

                return Div.Part(
                        DOM.div.Plain(user.name),
                        ()=>{

                            return DOM.button.Plain(
                                {
                                    onclick()
                                    {
                                        if(loggedIn.val == user.id)
                                        {
                                            loggedIn.val = "";
                                            realUser = false;
                                        }
                                        else
                                        {
                                            loggedIn.val = user.id;
                                            realUser = user;
                                        }
                                    }
                                },
                                loggedIn.val == user.id ? "this is me" : "impersonate"
                            )
                        },
                )

            })
        ),

        ()=>{
            return DOM.button({onclick(){
                showDesks.val = !showDesks.val;
            }}, showDesks.val ? "Show Parts" : "Show Desks")
        },

        ()=>{
            rerender.val;
            return showDesks.val ? Desks(graphParts.Desk) : Parts(graphParts.Part, graphParts.Pass);
        },

        ()=>{
            return blocking.val ? Div.BlockScreen() : null
        }

    )
}

function App()
{
    return Div.Plain(
        DOM.button({onclick:PickHandle}, "Pick Directory"),
        Object.entries(rooms.val).map(([room_id, graphParts])=>
            Room(room_id, graphParts)
        )
    )
}

van.add(document.body, App);
