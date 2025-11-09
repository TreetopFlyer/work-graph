export type User = {name:string, id:string, desk:Set<Desk>};
export type Role = {name:string, id:string, user:User[]};
export type Desk = {name:string, id:string, need:Part[], time:number[], make:Part[], pass:Map<Pass, Scan>, role:Role[]};
export type Pass = {name:string, id:string, path:string, date:Date, live:boolean, load:()=>Promise<void>, dump:()=>void};
export type Part = {name:string, id:string, pass:Map<Pass, {time:number, work:Work[], make:(user:User, data:string)=>Promise<void>}>, need:Desk[], make:Desk[], loop?:boolean};
export type Work = [time:number, data:string, user:User];
export type Scan = {need_dirty:number[], make_dirty:number[], need_empty:number[], make_empty:number[], due_date?:Date}

export type GraphBuilder=
<
    Users extends Record<string, string>,
    Roles extends Record<string, [ name:string, ...users:Array<keyof Users>]>,
    Parts extends Record<string, [ name:string, loop?:"loop"] >,
    Desks extends Record<string, [ name:string, roles:Array<keyof Roles>, need:Partial<Record<keyof Parts, number>>, ...make:Array<keyof Parts>]>,
>
(
    params:{
        meta?:{name:string},
        user:Users,
        role:Roles,
        part:Parts,
        desk:Desks,
        pass:Record<string, [name:string, date:Date]>,
    }
)
=>GraphParts


export type GraphParts = {
    Desk:Record<string, Desk>,
    Part:Record<string, Part>,
    User:Record<string, User>,
    Role:Record<string, Role>,
    Pass:Record<string, Pass>
    Path:string
}

// export type MassBuilder=<Params extends Record<string, GraphParts>>(rooms:Params)=>()=>{
//     [K in keyof Params]: GraphParts
// }

export type MassBuilder=<Params extends Record<string, GraphParts>>(rooms:Params)=>void

export type UserPassFile = Record<string, Array<[time:number, data:string, user?:User]>>

export type Scanner =(desk:Desk, pass:Pass)=>void;

declare global
{
    const Setup: MassBuilder;
    const Room: GraphBuilder;
    const BuildResults: Record<string, GraphParts>
}