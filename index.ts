import type { Serve, ServerWebSocket } from "bun";
import { exec } from "child_process";

// this is a really, REALLY stupid way of doing this;
// but it's 0:11 and i'm tired so fuck you, kill yourself

// since this site only hosts the homepage and tab count
// i don't believe i really need a http lib with handlers and such yet
// so this is still fine i think
const cachedIndex = await Bun.file(`${import.meta.dir}/pages/index.html`).text()
const cachedLogo  = (await Bun.file(`${import.meta.dir}/assets/logo.txt`).text()).split("\n")
const cachedTabsPage = await Bun.file(`${import.meta.dir}/pages/tabs.html`).text()

let tabInfo: {allWindows: string, allTabs: string} = {allWindows: "?", allTabs: "?"}

function exec_promise(input: Parameters<typeof exec>[0]): Promise<{stdout: string, stderr: string}> {
    return new Promise((resolve, reject) => {
        exec(input, (err, stdout, stderr) => {
            if (err) reject({err, stdout, stderr})
            else resolve({stdout, stderr})
        })
    })
}

const fakeModules = new Map<string, () => Promise<string>>()
    // stupid way of doing it but it's funny lol
    .set("Age", async () => `${
        new Date(
            Date.now()-new Date(`2009-11-10T00:00Z`).valueOf()
        ).getUTCFullYear()-1970
    } years old (2009-11-10)`)
    .set("Tabs", async () => `<a href="/tabs">${tabInfo.allTabs}</a>`)
    .set("WPM (60s)", async () => {
        let pb = (await (await fetch("https://api.monkeytype.com/users/personalBests?mode=time&mode2=60", {
            headers: {
                Authorization: `ApeKey ${process.env.apekey}`
            }
        })).json()).data
            
        return `<a href="https://monkeytype.com/profile/split1337">${pb.wpm} (${pb.acc}% acc, raw ${pb.raw})</a> on ${new Date(pb.timestamp).toISOString().split("T")[0]}`
    })

const customParams = new Map()
    .set("Discord", "<a href=\"https://discord.com/users/312700896343621633\">@video0.mov</a>")
    .set("GitHub", "<a href=\"https://github.com/nbitzz\">@nbitzz</a>")
    .set("Firefish", "<a rel=\"me\" href=\"https://coolviruses.download/@split\">@split@coolviruses.download</a>")
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
            .map(e => e.replaceAll("\x1b[0m","").split(boundary))
            .filter(e => e.every(a => a) && e[0] != "Terminal") // filters out [ "" ] and Terminal: bun

    return [
        (topDisplay ? `<span>${cachedLogo.join("\n")}</span>` : ""),
        "<strong>split</strong>",
        "-----",
        ...output.map(e => `<strong>${e[0]}</strong>: ${e[1].replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")}`),
        ...( await Promise.all(
            Array.from(fakeModules.entries())
            .map(async (e) => `<strong>${e[0]}</strong>: ${await e[1]().catch(e => { console.error(e); return "[error]" })}`) // so i can embed links, etc..
        ) ),
        ...Array.from(customParams.entries()).map(e => `<strong>${e[0]}</strong>: ${e[1]}`),
    ]
    .map((v,x) => !topDisplay ? `<span>${cachedLogo[x] || " ".repeat(cachedLogo[0].length)}</span>${v}` : v)
    .join("\n")
    
}

let listening: ServerWebSocket[] = []

const server = Bun.serve({
    async fetch(req: Request) {
    
        const url = new URL(req.url)
        const isMobile = req.headers.get("user-agent")?.includes("iPhone") || req.headers.get("user-agent")?.includes("Android")

        let res: Response

        switch(url.pathname.replace(/\/+$/,"")) {
            case "":
                const fastfetch_output = await fakefetch(isMobile)

                res = new Response(
                    // can't think of / too lazy to find any other way of doing this
                    // without like importing an entire virtual dom
                    cachedIndex.replace(/<slot\/>/g, fastfetch_output)
                )
                
                res.headers.set("content-type","text/html")
                return res
            break
            case "/tabs":
                res = new Response(
                    cachedTabsPage
                        .replaceAll("$tabcount", tabInfo.allTabs)
                        .replaceAll("$windowcount", tabInfo.allWindows)
                )
                res.headers.set("content-type", "text/html")
                return res
            break
            case "/tabs/count":
                // first, let's try upgrading them to a websocket connection
                if (server.upgrade(req)) return

                // if they're not willing to connect over ws, let's see what they want to do
                if (req.method == "GET") return new Response(JSON.stringify(tabInfo), { headers: { "Access-Control-Allow-Origin": "*" } })
                else if (req.method == "PUT") {
                    // check if their token is correct
                    if (req.headers.get("X-Token") != process.env.TOKEN) return

                    // update tabInfo
                    let json = (await req.json().catch(e => null)) as typeof tabInfo | null
                    if (json) {
                        tabInfo = json
                        listening.forEach(v => v.send(JSON.stringify(tabInfo)))
                    }

                    return new Response("OK", { headers: { "Access-Control-Allow-Origin": "*" } })
                }
            break;
            default:
                res = new Response(
                    cachedIndex.replace(/<slot\/>/g, `<strong>404!</strong> path not found`),
                    {status: 404}
                )
                
                res.headers.set("content-type","text/html")
                return res
            break
        }
    },

    websocket: {

        open(ws) {
            ws.send(JSON.stringify(tabInfo))
            listening.push(ws)
        },

        close(ws) {
            listening.splice(listening.indexOf(ws), 1)
        }

    },

    port: process.env.PORT ?? 38192
} as Serve /* bun won't accept this for some reason if i don't do as Serve */)
