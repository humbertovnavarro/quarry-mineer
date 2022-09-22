import { draw } from "cc.image.nft";
import * as strings from "cc.strings"
const INVENTORY_SLOTS = 16;
const INVENTORY_SIZE = INVENTORY_SLOTS * 64;
const MOTDS = [
"try adding a chest behind your computer before mining to dump excess items", 
"computers stop working outside of load distance, be careful!", 
"don't get your computer stuck in someones claim, they will trespass!",
"you can create a custom whitelist file by adding minecraft id's to whitelist.txt"
];
const MOTD = MOTDS[Math.round(math.random() % MOTDS.length)]
const WHITELIST = new Set<string>([

]);

let whitelistFile: FileHandle;
if(!fs.exists("whitelist.txt")) {
    const whitelistFile = fs.open("whitelist.txt", "w")[0];
    const resp = http.get("https://pastebin.com/raw/WJfBSt3H")[2];
    if(resp) {
        whitelistFile.write(resp.readAll());
        whitelistFile.close();
    }
}

let line: string | undefined;
whitelistFile = fs.open("whitelist.txt", "r")[0];
do {
    line = whitelistFile.readLine();
    if(line) {
        WHITELIST.add(line);
    }
} while(line != undefined);
whitelistFile.close();

const FUELS = new Set<string>([
    "minecraft:lava",
    "minecraft:coal",
    "minecraft:charcoal",
    "minecraft:coal_block",
]);


enum Direction {
    north,
    east,
    south,
    west
}

class MiningJob {
    x: number
    y: number
    z: number
    totalBlocks: number;
    constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.totalBlocks = this.x * this.y * this.z - 1;
    }
}

class MiningTurtle {
    logs: string[] = [];
    job?: MiningJob;
    gabageCollectionInterval = 32;
    // left / right
    x: number = 0;
    // up / down
    y: number = 0;
    // forward / back
    z: number = 0;
    minedBlocks: number = 0;
    steps: number = 0;
    facing: Direction = Direction.north;
    itemCount: number = 0;
    turnLeft() {
        if(!turtle.turnLeft()) {
            throw new Error("could not turn left");
        }
        if(this.facing === Direction.north) {
            this.facing = Direction.west;
            return;
        }
        this.facing--;
    }

    turnRight() {
        if(!turtle.turnRight()) {
            throw new Error("could not turn right");
        }
        if(this.facing === Direction.west) {
            this.facing = Direction.north;
            return
        }
        this.facing++;
    }

    face(target: Direction) {
        if(this.facing === target) return;

        if(this.facing === Direction.west && target === Direction.north) {
            this.turnRight();
            return;
        }
        if(this.facing === Direction.north && target === Direction.west) {
            this.turnLeft();
            return;
        }

        if(this.facing < target) {
            while(this.facing != target) {
                this.turnLeft();
            }
        }

        if(this.facing > target) {
            while(this.facing != target) {
                this.turnRight();
            }
        }
    }

    dumpInventory() {
        this.face(Direction.south);
        for(let i = 1; i <= INVENTORY_SIZE; i++) {
            turtle.transferTo(1, 64);
        }
    }

    log(text: string) {
        if(this.logs.length > 5) {
            this.logs.shift();
        }
        this.logs.push(text);
    }

    draw() {
            term.setBackgroundColor(colours.blue);
            term.clear();
            term.setCursorPos(1,1);
            term.setTextColor(colors.white);
            io.write(`blocks mined: ${this.minedBlocks}/${this.job.totalBlocks}\n`);
            io.write(`${string.format("%.2f", this.minedBlocks / this.job.totalBlocks * 100)}% complete\n`);
            io.write("=====================================\n")
            io.write(MOTD + "\n")
            io.write("=====================================\n")
            term.getSize();
            term.setTextColor(colors.black);
            this.logs.forEach(log => io.write(log.trim() + "\n"));
    }

    garbageCollect() {
        for(let i = 1; i <= INVENTORY_SLOTS; i++) {
            this.itemCount = 0;
            const item = turtle.getItemDetail() as {
                name: string,
                count: number
            } | undefined;
            turtle.select(i);
            (item: {name: string, count: number} | undefined) => {
                if(item === undefined) return;
                if(item.name && WHITELIST.has(item.name)) {
                    this.itemCount += item.count;
                } else {
                    turtle.drop();
                }
                if(this.itemCount + 32 > INVENTORY_SIZE) {
                    this.log("going home to offload")
                    this.dumpInventory();
                }
            };(item);
        }
    }

    forward() {
        if(!turtle.forward()) {
            throw new Error("could not move forward");
        }
        this.draw();
        this.steps++;
        if(this.steps % this.gabageCollectionInterval == 0) {
            this.garbageCollect();
        }
        switch(this.facing) {
            case Direction.north:
                this.z++;
                break;
            case Direction.south:
                this.z--;
                break;
            case Direction.west:
                this.x--;
                break;
            case Direction.east:
                this.x++;
                break;
        }
    }

    up() {
        this.steps++;
        if(!turtle.up()) {
            throw new Error("could not move up");
        }
        this.y++;
    }

    down() {
        this.steps++;
        if(!turtle.down()) {
            throw new Error("could not move down");
        }
        this.y--;
    }

    dig() {
        this.minedBlocks++;
        turtle.dig();
    }

    digDown() {
        this.minedBlocks++;
        turtle.digDown();
    }

    digUp() {
        this.minedBlocks++;
        turtle.digUp();
    }

    private mineRectangle(extent: number, depth: number, direction: Direction) {
        for(let i = 0; i < depth; i++) {
            for(let j = 0; j < extent - 1; j++) {
                this.dig();
                this.forward();
            }
            if(i === depth -1) return;
            switch(direction) {
                case Direction.west:
                    if(i % 2 === 0) {
                        this.turnLeft();
                        this.dig();
                        this.forward();
                        this.turnLeft();
                    } else {
                        this.turnRight();
                        this.dig();
                        this.forward();
                        this.turnRight();
                    }
                    break;
                default:
                    if(i % 2 === 0) {
                        this.turnRight();
                        this.dig();
                        this.forward();
                        this.turnRight();
                    } else {
                        this.turnLeft();
                        this.dig();
                        this.forward();
                        this.turnLeft();
                    }
                    break;
            }
        }
    }

    mineBox(extent: number, depth: number, height: number) {
        if(extent === undefined || depth === undefined || height === undefined) {
            throw new Error("tried to create box with a nil value")
        }
        const mineDown = height > 0;
        const left = extent < 0;
        extent = math.abs(extent);
        depth = math.abs(depth);
        height = math.abs(height);
        for(let i = 0; i < height; i++) {
            const upperRightCorner = this.x === extent - 1 && this.z === depth - 1;
            const bottomLeftCorner = this.x === 0 && this.z === 0;
            if(bottomLeftCorner) {
                this.face(Direction.north);
            }
            if(upperRightCorner) {
                this.face(Direction.south);
            }
            if(bottomLeftCorner || upperRightCorner) {
                this.mineRectangle(extent, depth, Direction.east);
            }
            if(i === height - 1) {
                return;
            }
            if(mineDown) {
                this.digDown();
                this.down();
            } else {
                this.digUp();
                this.up();
            }
        }
    }

    goTo(x: number, y:number, z:number) {
        while(this.y != y) {
            if(this.y < 0) {
                this.up();
            } else {
                this.down();
            }
        }
        while(this.x != x) {
            if(this.x < 0) {
                this.face(Direction.east);
                this.forward();
            }
            if(this.x > 0) {
                this.face(Direction.west);
                this.forward();
            }
        }
        while(this.z != z) {
            if(this.z < 0) {
                this.face(Direction.north);
                this.forward();
            }
            if(this.z > 0) {
                this.face(Direction.south);
                this.forward();
            }
        }
    }

    quarry(extent: number, depth: number, height: number) {
        term.setTextColor(colors.white);
        term.setBackgroundColor(colors.blue);
        this.job = new MiningJob(extent, height, depth);
        this.mineBox(extent, depth, height);
        this.goTo(0,0,0)
        this.face(Direction.south);
        this.dumpInventory();
        term.setTextColor(colors.green);
        this.log("Done!");
        this.draw();
    }
}

function interactiveMode() {
    term.setBackgroundColor(colours.blue);
    term.clear();
    term.setCursorPos(1,1);
    io.write(`<<<< QUARRY BY KAMAII >>>>\n`);
    io.write("WARNING: Turtle will mine to the right inclusively \n(the block the turtle is in counts)\n")
    io.write("input the amount of blocks to the right \n")
    term.setTextColor(colors.black);
    const xS = read();
    term.setBackgroundColor(colours.blue);
    term.clear();
    term.setCursorPos(1,1);

    term.setTextColor(colours.white);
    io.write("input the amount of blocks forward\n");
    term.setTextColor(colours.black);
    const zS = read();
    term.setBackgroundColor(colours.blue);
    term.clear();
    term.setCursorPos(1,1);

    term.setTextColor(colors.white);
    io.write("input the amount of blocks down (negative for up)\n");
    term.setTextColor(colours.black);
    const yS = read();
    term.setTextColor(colors.white);
    const t = new MiningTurtle();
    const x = tonumber(xS);
    const y = tonumber(yS);
    const z = tonumber(zS);
    term.setBackgroundColor(colours.green);
    term.clear();
    term.setCursorPos(1,1);
    t.log(`mining box of size: ${x}x,${y}y,${z}z`);
    t.quarry(x, z, y);
}

function main(...args: string[]) {
    if(args.length <= 3) {
        interactiveMode();
        return;
    }
    const [ xS, yS, zS ] = args;
    const x = tonumber(xS, 10);
    const y = tonumber(yS, 10);
    const z = tonumber(zS, 10);
    const t = new MiningTurtle();
    t.quarry(x, z, y);
}

main(...$vararg);