const MAX_LOG_SIZE = 7;
const INVENTORY_SLOTS = 16;
const MOTDS = [
"try adding a chest behind your computer before mining to dump excess items", 
"computers stop working outside of load distance, be careful!", 
"don't get your computer stuck in someones claim, they will trespass!",
"you can create a custom whitelist file by adding minecraft id's to whitelist.txt"
];
let MOTD = MOTDS[Math.round(math.random() % MOTDS.length)];
const WHITELIST = {}
let whitelistFile: FileHandle;
if(!fs.exists("whitelist.txt")) {
    const whitelistFile = fs.open("whitelist.txt", "w")[0];
    io.write("downloading fresh whitelist...\m")
    const resp = http.get("https://pastebin.com/raw/WJfBSt3H")[0] as HTTPResponse;
    if(resp != undefined && resp.readAll) {
        whitelistFile.write(resp.readAll());
        whitelistFile.close();
    } else {
        throw new Error("could not fetch block whitelist!")
    }
    io.write("done\n");
}
let line: string | undefined;
whitelistFile = fs.open("whitelist.txt", "r")[0];
do {
    line = whitelistFile.readLine();
    if(line) {
        WHITELIST[line] = true;
    }
} while(line != undefined);
whitelistFile.close();

if(Object.keys(WHITELIST).length === 0) {
    throw new Error("block whitelist is empty!")
}


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
    whitelist: {
        [key: string]: string
    }
    logs: string[] = [];
    job?: MiningJob;
    fixedUpdateInterval = 32;
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
    constructor(whitelist: {
        [key: string]: string
    }) {
        this.whitelist = whitelist;
    };

    addStep() {
        this.steps++;
        if(this.steps % this.fixedUpdateInterval == 0) {
            this.onFixedUpdate();
        }
    }

    onFixedUpdate() {
        this.tick();
    }

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
        if(this.facing < target) {
            while(this.facing != target) {
                this.turnLeft();
            }
        } else if(this.facing > target) {
            while(this.facing != target) {
                this.turnRight();
            }
        } else {
            return;
        }
    }

    dumpInventory() {
        for(let i = 1; i <= INVENTORY_SLOTS; i++) {
            if(turtle.getItemDetail(i) !== undefined) {
                turtle.select(i);
                turtle.transferTo(1);
            }
        }
    }

    log(text: string) {
        if(this.logs.length > MAX_LOG_SIZE) {
            this.logs.shift();
        }
        this.logs.push(`[${os.date("%M:%S")}] ${text}`);
    }
    
    printDistance(): string {
        if(this.steps > 1000) {
            return `${string.format("%.2f"), this.steps / 1000}km`
        } else {
            return `${this.steps}m`
        }
    }

    draw() {
            term.setBackgroundColor(colours.blue);
            term.clear();
            term.setCursorPos(1,1);
            term.setTextColor(colors.white);
            io.write(`blocks mined: ${this.minedBlocks}/${this.job.totalBlocks}\n`);
            io.write(`${string.format("%.2f", this.minedBlocks / this.job.totalBlocks * 100)}% complete\n`);
            io.write(`travelled ${this.printDistance()}\n`);
            io.write("=====================================\n")
            io.write(MOTD + "\n")
            io.write("=====================================\n")
            term.getSize();
            term.setTextColor(colors.black);
            this.logs.forEach(log => io.write(log.trim() + "\n"));
    }
    
    tick() {
        MOTD = MOTDS[Math.round(math.random() % MOTDS.length)];
        let occupiedSlots = 0;
        this.itemCount = 0;
        for(let i = 1; i <= INVENTORY_SLOTS; i++) {
            const item = turtle.getItemDetail(i);
            if(item != undefined) {
                if(this.whitelist[(item["name"])] != undefined) {
                    this.itemCount += item["count"];
                    occupiedSlots++;
                } else {
                    turtle.select(i);
                    turtle.drop();
                }
            }
        }
        if(occupiedSlots == INVENTORY_SLOTS && this.itemCount > INVENTORY_SLOTS * 32) {
            const x = this.x;
            const y = this.y;
            const z = this.z;
            const facing = this.facing;
            this.log("going home to offload");
            this.goTo(x,y,z);
            this.face(Direction.south)
            this.dumpInventory();
            this.goTo(x,y,z);
            this.face(facing);
        }
    }

    forward() {
        if(!turtle.forward()) {
            throw new Error("could not move forward");
        }
        this.addStep();
        this.draw();
        if(this.steps % this.fixedUpdateInterval === 0) {
            this.onFixedUpdate();
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
        this.addStep();
        if(!turtle.up()) {
            throw new Error("could not move up");
        }
        this.y++;
    }

    down() {
        this.addStep();
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

    snakeRight(depth: number, extent: number) {
        for(let j = 0; j < extent; j++) {
            for(let k = 0; k < depth; k++) {
                this.dig();
                this.forward();
            }
            if(j % 2 === 0) {
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
        }
        for(let k = 0; k < depth; k++) {
            this.dig();
            this.forward();
        }
    }

    snakeLeft(depth: number, extent: number) {
        for(let j = 0; j < extent; j++) {
            for(let k = 0; k < depth; k++) {
                this.dig();
                this.forward();
            }
            if(j % 2 !== 0) {
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
        }
        for(let k = 0; k < depth; k++) {
            this.dig();
            this.forward();
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
            if(this.x === 0) {
                this.face(Direction.north);
                this.snakeRight(depth - 1, extent - 1);
            } else if(this.z > 0) {
                this.turnLeft();
                this.turnLeft();
                this.snakeRight(depth - 1, extent - 1);
            } else {
                this.turnRight();
                this.turnRight();
                this.snakeLeft(depth - 1, extent - 1);
            }
            if(i != height - 1) {
                if(mineDown) {
                    this.digDown();
                    this.down();
                } else {
                    this.digUp();
                    this.up();
                }

            }
        }
    }

    goTo(x: number, y:number, z:number) {
        this.log(`moving to ${x}x, ${y}x, ${z}z`);
        this.draw();
        while(this.y != y) {
            if(this.y < y) {
                turtle.up();
                this.addStep();
                this.y++;
            } else if(this.y > y) {
                this.addStep();
                turtle.down();
                this.y++;
            } else {
                break;
            }
            this.draw();
        }
        while(this.x != x) {
            if(this.x < x) {
                this.face(Direction.east);
                this.addStep();
                if(!turtle.forward()) {

                }
                turtle.forward();
                this.x++;
            } else if(this.x > x) {
                this.face(Direction.west);
                this.addStep();
                turtle.dig();
                turtle.forward();
                this.x--;
            } else {
                break;
            }
            this.draw();
        }
        while(this.z != z) {
            if(this.z < z) {
                this.face(Direction.north);
                this.addStep();
                turtle.dig();
                turtle.forward();
                this.z++;
            } else if(this.z > z) {
                this.face(Direction.south);
                this.addStep();
                turtle.dig();
                turtle.forward();
                this.z--;
            } else {
                break;
            }
            this.draw();
        }
        this.log("done moving");
        this.draw();
    }

    quarry(extent: number, depth: number, height: number) {
        term.setTextColor(colors.white);
        term.setBackgroundColor(colors.blue);
        this.job = new MiningJob(extent, height, depth);
        this.log("check whitelist.txt for targeted blocks")
        this.log("cleaning inventory");
        // garbage collect at start
        this.tick();
        this.mineBox(extent, depth, height);
        this.goTo(0,0,0);
        this.log("cleaning inventory");
        this.draw();
        // garbage collect at end
        this.tick();
        this.log("dumping inventory");
        this.draw();
        this.face(Direction.south);
        this.dumpInventory();
        term.setTextColor(colors.green);
        this.log("Done!");
        this.face(Direction.north);
        this.draw();
    }

}

function interactiveMode() {
    term.setBackgroundColor(colours.blue);
    term.clear();
    term.setCursorPos(1,1);
    io.write(`<<<< QUARRY BY KAMAII >>>>\n`);
    io.write("WARNING: Turtle will mine to the right inclusively\n")
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
    const t = new MiningTurtle(WHITELIST);
    const x = tonumber(xS);
    const y = tonumber(yS);
    const z = tonumber(zS);
    term.setBackgroundColor(colours.green);
    term.clear();
    term.setCursorPos(1,1);
    t.log(`mining box of size: ${x}x,${y}y,${z}z`);
    t.quarry(x, z, y);
}

function main(...args) {
    if(args.length != 3) {
        interactiveMode();
    } else {
        const [ xS, yS, zS ] = args;
        const x = tonumber(xS, 10);
        const y = tonumber(yS, 10);
        const z = tonumber(zS, 10);
        const t = new MiningTurtle(WHITELIST);
        t.quarry(x, z, y);
    }

}

main(...$vararg);