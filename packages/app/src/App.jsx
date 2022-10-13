import { Button } from "@abc/ui";
import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <Button action={() => setCount((count) => count + 1)}>
        count is {count}
      </Button>
    </div>
  );
}

export default App;
