import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Tools() {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
    }
  };

  const inputOperation = (nextOperation: string) => {
    const inputValue = Number.parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (
    firstValue: number,
    secondValue: number,
    operation: string
  ) => {
    switch (operation) {
      case "+":
        return firstValue + secondValue;
      case "-":
        return firstValue - secondValue;
      case "×":
        return firstValue * secondValue;
      case "÷":
        return firstValue / secondValue;
      case "=":
        return secondValue;
      default:
        return secondValue;
    }
  };

  const performCalculation = () => {
    const inputValue = Number.parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const clearAll = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const clearEntry = () => {
    setDisplay("0");
  };

  const tools = [
    {
      title: "Notepad",
      description: "Quick note-taking with project linking",
      icon: FileText,
      href: "/notepad",
      color: "bg-blue-500",
    },
    {
      title: "Calculator",
      description: "Basic arithmetic calculator",
      icon: Calculator,
      href: "#calculator",
      color: "bg-green-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
        <p className="text-muted-foreground">
          Helpful utilities for your workflow
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool) => (
          <Card key={tool.title} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${tool.color}`}>
                    <tool.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{tool.title}</h3>
                    <p className="text-muted-foreground">{tool.description}</p>
                  </div>
                </div>
                {tool.href.startsWith("#") ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      document.getElementById("calculator")?.scrollIntoView()
                    }
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Link to={tool.href}>
                    <Button variant="outline">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calculator */}
      <Card id="calculator">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-sm mx-auto">
            {/* Display */}
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-4">
              <div className="text-right text-2xl font-mono font-bold min-h-[2rem] flex items-center justify-end">
                {display}
              </div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {/* Row 1 */}
              <Button
                variant="outline"
                onClick={clearAll}
                className="col-span-2 bg-transparent"
              >
                Clear
              </Button>
              <Button variant="outline" onClick={clearEntry}>
                CE
              </Button>
              <Button variant="outline" onClick={() => inputOperation("÷")}>
                ÷
              </Button>

              {/* Row 2 */}
              <Button variant="outline" onClick={() => inputNumber("7")}>
                7
              </Button>
              <Button variant="outline" onClick={() => inputNumber("8")}>
                8
              </Button>
              <Button variant="outline" onClick={() => inputNumber("9")}>
                9
              </Button>
              <Button variant="outline" onClick={() => inputOperation("×")}>
                ×
              </Button>

              {/* Row 3 */}
              <Button variant="outline" onClick={() => inputNumber("4")}>
                4
              </Button>
              <Button variant="outline" onClick={() => inputNumber("5")}>
                5
              </Button>
              <Button variant="outline" onClick={() => inputNumber("6")}>
                6
              </Button>
              <Button variant="outline" onClick={() => inputOperation("-")}>
                -
              </Button>

              {/* Row 4 */}
              <Button variant="outline" onClick={() => inputNumber("1")}>
                1
              </Button>
              <Button variant="outline" onClick={() => inputNumber("2")}>
                2
              </Button>
              <Button variant="outline" onClick={() => inputNumber("3")}>
                3
              </Button>
              <Button
                variant="outline"
                onClick={() => inputOperation("+")}
                className="row-span-2"
              >
                +
              </Button>

              {/* Row 5 */}
              <Button
                variant="outline"
                onClick={() => inputNumber("0")}
                className="col-span-2"
              >
                0
              </Button>
              <Button variant="outline" onClick={() => inputNumber(".")}>
                .
              </Button>
              <Button
                onClick={performCalculation}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                =
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
