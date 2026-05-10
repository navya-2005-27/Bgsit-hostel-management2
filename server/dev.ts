import { createServer } from "./index";
import { ensureStudentSchema } from "./routes/students";

const app = createServer();
const port = Number(process.env.PORT || 3000);

await ensureStudentSchema();

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});