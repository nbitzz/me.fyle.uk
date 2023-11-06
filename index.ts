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

const customParams = {
    "Discord": "@video0.mov",
    "Fediverse": "<a href=\"https://coolviruses.download/@split\">@split@coolviruses.download</a>"
}

async function fakefetch() {
    const boundary = "=="

    // not doing Object.fromEntries() here cause i'd do Object.entries() later anyway
    let output = 
        (await exec_promise(`fastfetch --separator ${boundary}`))
            .stdout
            .split("\n")
            .slice(2)
            .map(e => e.split(boundary))
            .filter(e => e.every(a => a)) // filters out [ "" ]

    let ff_text = [
        "<strong>split</strong>",
        "-----",
        ...output.map(e => `<strong>${e[0]}</strong>: ${e[1].replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}`),
        ...Object.entries(customParams).map(e => `<strong>${e[0]}</strong>: ${e[1]}`) // so i can embed links, etc..
    ]

    // attach logo

    cachedLogo.forEach((v,x) => ff_text[x] = `<span>${v || " ".repeat(cachedLogo[0].length)}</span>${ff_text[x]??""}`)

    return ff_text.join("\n")
    
}

Bun.serve({
    async fetch(req: Request) {
        
        const url = new URL(req.url)
        const isMobile = req.headers.get("user-agent")?.includes("iPhone") || req.headers.get("user-agent")?.includes("Android")

        /*
        if (isMobile) {
            url.hostname = "old.me.fyle.uk"
            // someone pleaase tell me how the fuck redirects work in bun
            // for now i'll just do this LOL
            return new Response("",{
                status: 302,
                headers: {
                    "Location": url.toString()
                }
            })
        }
        */

        const fastfetch_output = await fakefetch()

        let res = new Response(
            // can't think of / too lazy to find any other way of doing this
            // without like importing an entire virtual dom
            cachedIndex.replace(/<slot\/>/g, fastfetch_output)
        )
        
        res.headers.set("content-type","text/html")
        return res

    }
} as Serve /* bun won't accept this for some reason if i don't do as Serve */)