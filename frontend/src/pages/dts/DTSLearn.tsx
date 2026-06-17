// pages/dts/DTSLearn.tsx
import { useState } from 'react'

const TOPICS = [
  {
    id: 'intro',
    title: 'What is Device Tree?',
    content: `Device Tree (DT) is a data structure that describes hardware to the operating system. Instead of hardcoding hardware details in the kernel, the Device Tree separates hardware description from software.

In Zephyr, Device Tree is used to describe:
• Which peripherals exist on a board (GPIO, UART, SPI, I2C…)
• Where they are in memory (base address, size)
• Which interrupt lines they use
• How they are connected to each other

The Zephyr build system reads .dts files at compile time and generates C macros your firmware uses via DT_* APIs.`,
    code: `/* Simple DTS example */
/ {
    leds {
        compatible = "gpio-leds";
        led0: led_0 {
            gpios = <&gpio0 13 GPIO_ACTIVE_LOW>;
            label = "Green LED";
        };
    };
};`,
  },
  {
    id: 'nodes',
    title: 'Nodes & Properties',
    content: `A DTS file is a tree of nodes. Each node represents a hardware component.

Node anatomy:
• Label (optional): lets you reference the node elsewhere with &label
• Name: describes the device type
• Unit address: the peripheral's base address
• Properties: key-value pairs that configure the device

Properties have types: string, int, boolean, phandle, array, byte-array.`,
    code: `/* Node structure */
label: node-name@unit-address {
    /* string property */
    compatible = "vendor,device-name";

    /* integer property */
    reg = <0x40014000 0x400>;

    /* boolean property (presence = true) */
    output-enable;

    /* phandle (reference to another node) */
    clocks = <&rcc STM32_CLOCK_BUS_APB2 0x00000001>;

    /* array */
    interrupts = <5 1>;
};`,
  },
  {
    id: 'compatible',
    title: 'The compatible Property',
    content: `compatible is the most important property. It tells Zephyr which driver to use for this node.

Format: "vendor,device-name"
• vendor: lowercase vendor prefix (espressif, nordic, st, nxp…)
• device-name: the specific peripheral name

Zephyr matches the compatible string to a YAML binding file in dts/bindings/. That binding defines which properties are valid, which are required, and their types.

A node can have multiple compatible strings — Zephyr tries them in order.`,
    code: `/* compatible examples */
uart0: uart@40002000 {
    compatible = "nordic,nrf-uarte", "nordic,nrf-uart";
    /*           ↑ preferred         ↑ fallback        */
    reg = <0x40002000 0x1000>;
    status = "okay";
};

ledc0: ledc@60019000 {
    compatible = "espressif,esp32-ledc";
    reg = <0x60019000 0x1000>;
    status = "okay";
};`,
  },
  {
    id: 'overlays',
    title: 'Overlay Files',
    content: `Overlay files (.overlay) let your application modify the board's base DTS without editing it directly.

They are placed in your application folder:
  my_app/boards/esp32s3_devkitc.overlay

The build system automatically finds and applies them. Overlays use & references to modify existing nodes — you don't redefine the whole node, just the parts you want to change.

Common uses:
• Enable a peripheral: status = "okay"
• Configure pins via pinctrl
• Add aliases for your application
• Define flash partitions`,
    code: `/* boards/esp32s3_devkitc.overlay */

/* Step 1: Define pin mapping */
&pinctrl {
    uart1_default: uart1_default {
        group1 {
            pinmux = <UART1_TX_GPIO17>,
                     <UART1_RX_GPIO18>;
        };
    };
};

/* Step 2: Enable the peripheral */
&uart1 {
    status = "okay";
    pinctrl-0 = <&uart1_default>;
    pinctrl-names = "default";
    current-speed = <115200>;
};

/* Step 3: Add an alias so your code can find it */
/ {
    aliases {
        my-uart = &uart1;
    };
};`,
  },
  {
    id: 'aliases',
    title: 'Aliases & Chosen',
    content: `aliases and chosen are special nodes at the root of the DTS.

aliases: give friendly names to nodes so your application code doesn't need to know the exact node path. Zephyr's sample apps use aliases like "led0", "sw0", "bootloader-uart".

chosen: tell Zephyr which specific node to use for system-level roles like the console UART, shell UART, or Zephyr log backend.`,
    code: `/ {
    aliases {
        led0        = &led_0;      /* board LED */
        sw0         = &button_0;   /* board button */
        pwm-led0    = &pwm_led0;   /* PWM LED */
        my-sensor   = &bme280;     /* your sensor */
    };

    chosen {
        zephyr,console    = &uart0;  /* printk output */
        zephyr,shell-uart = &uart0;  /* Zephyr shell */
        zephyr,sram       = &sram0;  /* system RAM */
        zephyr,flash      = &flash0; /* flash storage */
    };
};`,
  },
  {
    id: 'pinctrl',
    title: 'Pin Control (pinctrl)',
    content: `pinctrl maps GPIO pins to peripheral signals. Most peripherals require a pinctrl configuration before they can be used.

How it works:
1. The &pinctrl node contains named states (e.g. uart0_default, uart0_sleep)
2. Each state contains groups of pins with their function
3. The peripheral node references the state via pinctrl-0, pinctrl-1...
4. pinctrl-names assigns human-readable names to each state

On ESP32, pin functions use macros from dt-bindings/pinctrl/esp32s3-pinctrl.h`,
    code: `/* pinctrl for ESP32-S3 UART */
&pinctrl {
    uart0_default: uart0_default {
        group1 {
            /* TX on GPIO43, RX on GPIO44 */
            pinmux = <UART0_TX_GPIO43>,
                     <UART0_RX_GPIO44>;
            bias-disable;
        };
    };

    uart0_sleep: uart0_sleep {
        group1 {
            pinmux = <UART0_TX_GPIO43>,
                     <UART0_RX_GPIO44>;
            /* pull-up to avoid floating lines */
            bias-pull-up;
        };
    };
};

&uart0 {
    status = "okay";
    pinctrl-0 = <&uart0_default>;
    pinctrl-1 = <&uart0_sleep>;
    pinctrl-names = "default", "sleep";
};`,
  },
]

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)', marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 14px', background: '#161b22', borderBottom: '1px solid var(--color-border)' }}>
        <span style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>dts</span>
        <button onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
          style={{ background: 'none', border: 'none', color: copied ? 'var(--color-green)' : 'var(--color-muted)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '14px 16px', overflowX: 'auto', background: '#0d1117', fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.7, color: '#e6edf3' }}>
        {code}
      </pre>
    </div>
  )
}

export default function DTSLearn() {
  const [active, setActive] = useState('intro')
  const topic = TOPICS.find(t => t.id === active)!

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', minHeight: '100vh' }}>

      {/* Topic list */}
      <div style={{ borderRight: '1px solid var(--color-border)', padding: '24px 12px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', padding: '0 8px', marginBottom: 10 }}>
          Topics
        </div>
        {TOPICS.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', textAlign: 'left', padding: '7px 10px',
              borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
              background: active === t.id ? 'rgba(88,166,255,0.1)' : 'none',
              color: active === t.id ? 'var(--color-text)' : 'var(--color-muted)',
              borderLeft: active === t.id ? '2px solid #58a6ff' : '2px solid transparent',
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 11, color: 'var(--color-muted)', fontFamily: 'var(--font-mono)', minWidth: 16 }}>{String(i + 1).padStart(2, '0')}</span>
            {t.title}
          </button>
        ))}
      </div>

      {/* Topic content */}
      <div style={{ padding: '36px 40px', maxWidth: 780 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, color: 'var(--color-text)' }}>
          {topic.title}
        </h1>
        <div style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--color-muted)', whiteSpace: 'pre-line' }}>
          {topic.content}
        </div>
        <CodeBlock code={topic.code} />

        {/* Next topic */}
        {TOPICS.findIndex(t => t.id === active) < TOPICS.length - 1 && (
          <button
            onClick={() => {
              const idx = TOPICS.findIndex(t => t.id === active)
              setActive(TOPICS[idx + 1].id)
            }}
            style={{
              marginTop: 32, padding: '10px 20px', borderRadius: 6,
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              color: '#58a6ff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            Next: {TOPICS[TOPICS.findIndex(t => t.id === active) + 1].title} →
          </button>
        )}
      </div>
    </div>
  )
}
