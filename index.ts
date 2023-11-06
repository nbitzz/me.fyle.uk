import { Serve } from "bun";
import { exec } from "child_process";

// this is a really, REALLY stupid way of doing this;
// but it's 0:11 and i'm tired so fuck you, kill yourself

const cachedIndex = await Bun.file(`${import.meta.dir}/pages/index.html`).text()
const cachedLogo  = (await Bun.file(`${import.meta.dir}/assets/logo.txt`).text()).split("\n")

function exec_promise(input: Parameters<typeof exec>[0]): Promise<{stdout: string, stderr: string}> {
    return new Promise((resolve, reject) => {
        exec(input, (err, stdout, stderr) => {
            if (err) reject({err, stdout, stderr})
            else resolve({stdout, stderr})
        })
    })
}

const customParams = new Map()
    .set("Discord", "@video0.mov")
    .set("GitHub", "<a href=\"https://github.com/nbitzz\">@nbitzz</a>")
    .set("Fediverse", "<a href=\"https://coolviruses.download/@split\">@split@coolviruses.download</a>")
    .set("Check out my friends at Etcetera", "<a href=\"https://cetera.uk\">cetera.uk</a>")
    .set("and the project I work with them on", "<a href=\"https://github.com/mollersuite/monofile\">monofile</a>")

async function fakefetch(topDisplay:boolean=false) {
    const boundary = "=="

    // not doing Object.fromEntries() here cause i'd do Object.entries() later anyway
    let output = 
        (await exec_promise(`fastfetch --separator ${boundary}`))
            .stdout
            .split("\n")
            .slice(2)
            .map(e => e.split(boundary))
            .filter(e => e.every(a => a) && e[0] != "Terminal") // filters out [ "" ] and Terminal: bun

    return [
        ...(topDisplay ? cachedLogo : []),
        "<strong>split</strong>",
        "-----",
        ...output.map(e => `<strong>${e[0]}</strong>: ${e[1].replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}`),
        ...Array.from(customParams.entries()).map(e => `<strong>${e[0]}</strong>: ${e[1]}`) // so i can embed links, etc..
    ]
    .map((v,x) => topDisplay ? `<span>${cachedLogo[x] || " ".repeat(cachedLogo[0].length)}</span>${v}` : v)
    .join("\n")
    
}

Bun.serve({
    async fetch(req: Request) {
        const isMobile = req.headers.get("user-agent")?.includes("iPhone") || req.headers.get("user-agent")?.includes("Android")

        const fastfetch_output = await fakefetch(!isMobile)

        let res = new Response(
            // can't think of / too lazy to find any other way of doing this
            // without like importing an entire virtual dom
            cachedIndex.replace(/<slot\/>/g, fastfetch_output)
        )
        
        res.headers.set("content-type","text/html")
        return res

    },

    port: process.env.PORT ?? 38192
} as Serve /* bun won't accept this for some reason if i don't do as Serve */)