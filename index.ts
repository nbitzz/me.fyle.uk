import { Serve } from "bun";
// this is semi-lazy but that's fine, honestly
import { exec } from "child_process";
import AnsiConverter from "ansi-to-html"

const { toHtml } = new AnsiConverter()

const cachedFile = await Bun.file(`${import.meta.dir}/pages/index.html`).text()

function exec_promise(input: Parameters<typeof exec>[0]): Promise<{stdout: string, stderr: string}> {
    return new Promise((resolve, reject) => {
        exec(input, (err, stdout, stderr) => {
            if (err) reject({err, stdout, stderr})
            else resolve({stdout, stderr})
        })
    })
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

        const neofetch_output = (await exec_promise(isMobile ? "pfetch" : "fastfetch --load-config neofetch")).stdout
        console.log(neofetch_output)

        let res = new Response(
            // can't think of / too lazy to find any other way of doing this
            // without like importing an entire virtual dom
            cachedFile.replace(/<slot\/>/g, neofetch_output)
        )
        
        res.headers.set("content-type","text/html")
        return res

    }
} as Serve /* bun won't accept this for some reason if i don't do as Serve */)