export interface Line {speaker:string; text:string;}
export const CHAPTERS: {tag:string; lines:Line[]; after:string}[] = [
  {tag:'01 · THE LAST TRAIN LEFT WITHOUT YOU',lines:[
    {speaker:'NOIR',text:'The last thing I remember is a warm hand. Now the platform is cold. The clock has no hands at all.'},
    {speaker:'THE PLATFORM',text:'Passenger Noir. Your reflection has boarded without you. Follow the light. Do not follow the footsteps.'},
    {speaker:'NOIR',text:'There are little pieces of moon on the rails. Something has been breaking the sky.'}
  ],after:'The first door opens. Behind you, a second pair of paws stops walking.'},
  {tag:'02 · SOMETHING HERE IS STILL WORKING',lines:[
    {speaker:'NOIR',text:'The saws turn. The workers don’t. Someone has folded their coats over every chair.'},
    {speaker:'THE OPERATOR',text:'A city needs light. A city needs fuel. Please keep your questions away from the machinery.'}
  ],after:'You find a bell with its tongue removed. The silence inside it has a heartbeat.'},
  {tag:'03 · THE CITY LEARNS YOUR VOICE',lines:[
    {speaker:'THE RADIO',text:'Good evening, Noir. Good evening, Noir. Good evening, No—'},
    {speaker:'NOIR',text:'Every sign knows my name. None of them will tell me where I am.'},
    {speaker:'THE OPERATOR',text:'Names are expensive here. We keep them safe by keeping them out of circulation.'}
  ],after:'The transmission ends. Your voice continues for three seconds after you stop.'},
  {tag:'04 · DO NOT LOOK UNDER THE CLOUDS',lines:[
    {speaker:'NOIR',text:'The towers are hanging from the clouds. I can see the knots.'},
    {speaker:'THE CHOIR',text:'We used to have names. We used to have windows. We used to be able to close our eyes.'}
  ],after:'One voice sings the tune your person used to hum. You are not the first one to miss home.'},
  {tag:'05 · A MISSING PAGE HAS TEETH',lines:[
    {speaker:'THE OPERATOR',text:'There is nothing beyond this district. If you see a door, it is a fault in the picture.'},
    {speaker:'NOIR',text:'The fault smells like rain. There is a note scratched under the frame: KEEP THE SMALL THINGS.'}
  ],after:'For a moment the city loses its outline. In the dark, you see the people it has erased.'},
  {tag:'06 · A GARDEN THAT REMEMBERS',lines:[
    {speaker:'NOIR',text:'The flowers are white now. They’re growing from the cracks where the names used to be.'},
    {speaker:'A SMALL VOICE',text:'They don’t burn us. They forget us. It hurts longer.'},
    {speaker:'NOIR',text:'Then I’ll remember. Even if I have to carry every piece myself.'}
  ],after:'You tuck a memory into your scarf. It weighs less than a petal. It makes the whole city heavier.'},
  {tag:'07 · THE BELLS ARE NOT EMPTY',lines:[
    {speaker:'THE OPERATOR',text:'I kept the lights on after everyone left. Someone had to. Would you have let the city go dark?'},
    {speaker:'NOIR',text:'You didn’t keep them here. You kept what was left of them.'}
  ],after:'The foundry stops for the first time in years. One bell finally rings.'},
  {tag:'08 · ROOM 351',lines:[
    {speaker:'NOIR',text:'Every bed has a light above it. Every light has a name inside it.'},
    {speaker:'THE RADIO',text:'If you hear your own name from an empty room, leave the door closed.'},
    {speaker:'NOIR',text:'My reflection is sitting in the last bed. It won’t look at me.'}
  ],after:'Your reflection mouths one word: LISTEN. You cannot tell whether it is a warning.'},
  {tag:'09 · THERE WAS NEVER A MOON',lines:[
    {speaker:'THE OPERATOR',text:'That light above us is the exit. I painted it round so nobody would try to open it.'},
    {speaker:'NOIR',text:'Then why is it opening now?'},
    {speaker:'THE CHOIR',text:'Because something small has been bringing us back.'}
  ],after:'The sky tears without a sound. On the other side, morning is waiting.'},
  {tag:'10 · THE PRICE OF A WAY HOME',lines:[
    {speaker:'THE OPERATOR',text:'One name can power the door. Give me yours, and they can leave. Keep it, and you can.'},
    {speaker:'NOIR',text:'A name isn’t fuel. It’s how someone finds you in the dark.'},
    {speaker:'YOUR REFLECTION',text:'There is another way. But you have to remember who is speaking.'}
  ],after:'The door is open. For once, the city waits for you to decide.'}
];
export const ENDINGS = {
  lantern: {title:'The Little Lantern',tag:'ENDING I · A LIGHT LEFT BEHIND',lines:[
    'You give the door your name. The city empties quietly, coat by coat, voice by voice.',
    'Morning reaches the platform. A person waits there, holding an empty scarf.',
    'At night, a small white light crosses the rails. It always stops beside anyone who is lost.'
  ]},
  home: {title:'Nine Lives, One Shadow',tag:'ENDING II · THE WAY HOME',lines:[
    'You step through with your name held tightly between your teeth. The door closes behind you.',
    'A warm hand finds you. The clock has hands again. For a little while, that is enough.',
    'When you sleep, a city turns on its lights. Your reflection never quite closes its eyes.'
  ]},
  dawn: {title:'Every Name, Remembered',tag:'ENDING III · THE TRUE DAWN',lines:[
    'You lay ten small memories on the floor. You say their names. The Operator remembers its own.',
    'The door no longer needs a sacrifice. Your reflection takes your paw, and the city walks out with you.',
    'At home, your person opens the window. For the first time, the morning has no shadow waiting behind it.'
  ]}
};
export type EndingKey = keyof typeof ENDINGS;
export const CREATOR_LINKS = [
  {label:'Portfolio',url:'https://adnannaous.vercel.app'},
  {label:'GitHub',url:'https://github.com/AdnanNaous'},
  {label:'X · @vc_351',url:'https://x.com/vc_351'},
  {label:'LinkedIn',url:'https://www.linkedin.com/in/adnan-naous/'},
  {label:'All links',url:'https://linktr.ee/VC351'}
];
