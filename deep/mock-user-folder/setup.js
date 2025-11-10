//@ts-check
///<reference path="./setup.d.ts"/>

Setup(
{
    room_01:Room({
        user:{
            u1:"developer person",
            u2:"team lead person",
            u3:"writer person",
        },
        role:{
              dev:["Development", "u1"],
            write:["Writing", "u3"],
            admin:["Admin", "u2"]
        },
        part:{
            p1:["Page title"],
            p2:["Page slug"],
            p3:["Page preview"],
            p4:["Page Project"],
            p5:["Page Corrections", "loop"],
        },
        desk:{
            d1:["Write page metas",   ["admin", "write"], { p1:48, p2:24      }            ],
            d2:["Build Page preview", ["admin", "dev"  ], { p1:1,  p2:1, p5:4 }, "p3", "p4"],
            d3:["Proof Page",         ["admin", "write"], { p3:1,             }, "p5"      ],
        },
        pass:{
            pass_01:["Q4 Project", new Date("Nov 1, 2025")],
            //pass_02:["February"],
            //pass_03:["March"],
            //pass_04:["April"],
            //pass_05:["May"],
            //pass_06:["June"],
            //pass_07:["July"],
        }
    })
});