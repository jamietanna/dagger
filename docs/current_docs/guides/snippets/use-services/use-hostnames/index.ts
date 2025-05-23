import { connect, Client } from "@dagger.io/dagger"

connect(
  async (client: Client) => {
    // get hostname of service container
    const val = await client
      .container()
      .from("python")
      .withExec(["python", "-m", "http.server"])
      .asService()
      .hostname()
    console.log(val)
  },
  { LogOutput: process.stderr }
)
