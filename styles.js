export default Gale({
    Title:{
        padding:"2rem",
        background: "blue",
        color:"white"
    },
    Plain:{},
    PartGroup:{
        display: `flex`,
        flexWrap: `wrap`
    },
    Icon:{
        background:"black",
        color:"white",
        borderRadius:"2rem",
        fontWeight:"bolder",
        padding:"0 0.8rem",
        margin:"0 1rem"
    },
    Part:{
        border: `1px solid black`,
        borderRadius: `5px`,
        padding: `0.5rem 1rem`,
        minHeight: "2rem",
    },
    PartGood:{
        background:"#009b2e",
        color:"white",
    },
    PartEmpty:{
        background:"#ddd"
    },
    PartDirty:{
        background:"red",
        color:"white",
        fontWeight:"bold"
    },
    PartCaution:{
        background:"yellow",
        color:"black",
    },
    BlockScreen:{
        position: "fixed",
        zIndex: "9999",
        top: "0",
        left: "0",
        width: "100%",
        height: "100%",
        background: "rgba(128, 128, 128, 0.5)"
    },
    DeskContainer:{
        border: `1px solid black`,
        borderRadius: `5px`,
        padding: `1rem`
    },
    GapHorizontal:{
        borderCollapse:"separate",
        borderSpacing:"0.3rem 2rem",
    },
    GapVertical:{
        borderCollapse:"separate",
        borderSpacing:"2rem 0.2rem",
    }
});