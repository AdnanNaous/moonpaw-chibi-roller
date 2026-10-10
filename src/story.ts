export interface Line { speaker: string; text: string }
export interface FieldNote { speaker: string; text: string }

/** Physical actions in the opening shots, separate from witness dialogue. */
export const CHAPTER_SHOTS = [
  [{action:'A ribbon catches on the open gate.',prop:'ribbon',duration:4.8},{action:'A name has been cut out of the stone.',prop:'slate',duration:4.2},{action:'The lamp answers when Noir touches the grave.',prop:'lamp',duration:4.6}],
  [{action:'The chain pulls. There is no worker at the other end.',prop:'chain',duration:4.6},{action:'A nameplate disappears into the cold furnace.',prop:'nameplate',duration:4.4},{action:'One bell tongue was never melted.',prop:'tongue',duration:4.6}],
  [{action:'The water stops one stroke below the window.',prop:'water',duration:4.5},{action:'The bolt is on this side of the door.',prop:'bolt',duration:4.1},{action:'A small handprint remains above the tide.',prop:'hand',duration:4.6}],
  [{action:'The ink vanishes. The street remains.',prop:'ink',duration:4.4},{action:'Under the erased entry: Elian Ilyan.',prop:'page',duration:4.7},{action:'A seal holds the missing page shut.',prop:'seal',duration:4.2}],
  [{action:'The rope tightens before the bell moves.',prop:'rope',duration:4.7},{action:'The brass tongue strikes. A name disappears.',prop:'bell',duration:4.2},{action:'Between two strokes, a voice almost escapes.',prop:'interval',duration:4.8}],
  [{action:'The branch bends toward a name spoken aloud.',prop:'branch',duration:4.8},{action:'Mara tied the same knot here.',prop:'knot',duration:4.5},{action:'Noir leaves the white fruit untouched.',prop:'fruit',duration:4.6}],
  [{action:'Scratches continue behind the locked door.',prop:'marks',duration:4.4},{action:'Cell seven opens from the inside.',prop:'cell',duration:4.5},{action:'The key turns. Nothing steps out.',prop:'key',duration:4.8}],
  [{action:'Ten voices start on the same breath.',prop:'voices',duration:4.5},{action:'Their last word has been crossed out.',prop:'score',duration:4.6},{action:'The bell waits for a sound that does not come.',prop:'silence',duration:5.2}],
  [{action:'The reflection turns before Noir does.',prop:'reflection',duration:4.8},{action:'Two sets of tracks reach the same gate.',prop:'tracks',duration:4.5},{action:'The false moon opens like a mouth.',prop:'moon',duration:4.8}],
  [{action:'The Regent holds a place for one more name.',prop:'throne',duration:4.6},{action:'Noir sets the witnesses before him.',prop:'witnesses',duration:4.4},{action:'For the first time, the bell cannot choose.',prop:'fracture',duration:4.9},{action:'The way home waits beyond the broken seal.',prop:'threshold',duration:4.6}]
] as const;

/** Two records per chapter: one at the midpoint and one near the exit. */
export const FIELD_NOTES: [FieldNote, FieldNote][] = [
  [{speaker:'GRAVE MARKER',text:'Sera Vale. Bell ringer. Buried with an empty coffin; her name kept the first lamp burning.'},{speaker:'SERA’S SCRATCHES',text:'The dead are not calling us down. Something below is wearing their voices to make us open the gate.'}],
  [{speaker:'FOUNDRY LEDGER',text:'Forty-seven bell tongues were cast from confiscated nameplates. The workers were paid in hours of warmth.'},{speaker:'WORKER EDA',text:'I hid one tongue in the slag. A bell can carry a warning as well as a command.'}],
  [{speaker:'FLOOD REGISTER',text:'The lower district was sealed while families were still inside. The water rose after the doors were locked.'},{speaker:'CHILD’S MESSAGE',text:'My brother Tovin taught me to breathe between the bell strokes. I counted until he stopped answering.'}],
  [{speaker:'ARCHIVIST’S MARGIN',text:'Regent Ilyan ordered the names removed from every map. The streets remained; the people became impossible to find.'},{speaker:'MISSING PAGE',text:'The seal was called mercy. Its engine needed one living name each night. The first belonged to his daughter, Elian.'}],
  [{speaker:'BELL KEEPER',text:'Each toll makes the city forget a little more. The ropes pull themselves now.'},{speaker:'ELIAN’S PRAYER',text:'Father, if you hear me in the bell, let it go silent. I can bear one death. I cannot bear this forever.'}],
  [{speaker:'GARDENER’S TAG',text:'The orchard was planted over the unmarked graves. White fruit forms where a name is spoken aloud.'},{speaker:'MARA’S RIBBON',text:'Noir, if you followed the light, I am sorry. I tied this where you would find it. The path home is real, but it asks a price.'}],
  [{speaker:'CELL SEVEN',text:'The prisoners were made to remember the erased. They were called dangerous because they could still say the names.'},{speaker:'WARDEN’S CONFESSION',text:'I guarded them until my own son was taken for fuel. I unlocked one cell. The Regent locked the whole prison around me.'}],
  [{speaker:'CHOIR SCORE',text:'There is no hymn here. Ten witnesses speak over one another, trying to say what happened in the flood.'},{speaker:'TENOR’S NOTE',text:'We learned to hold the last word in silence. That silence is the interval the bell cannot command.'}],
  [{speaker:'ENGINE SCHEMATIC',text:'The false moon is the bell’s mouth. Beneath it waits the first name, split from its body to test the door.'},{speaker:'YOUR REFLECTION',text:'I remember what you were made to forget: you opened the gate once. You ran when you heard Elian inside. I stayed.'}],
  [{speaker:'REGENT’S LAST ORDER',text:'If the witnesses are named together, the engine must release them. The bell will break. Nothing it preserved will survive unchanged.'},{speaker:'ELIAN’S VOICE',text:'Do not save my father from grief. Let him feel it. Then let us leave.'}]
];

export const CHAPTERS: {tag:string; lines:Line[]; after:string}[] = [
  {tag:'01 · THE CRYPT',lines:[
    {speaker:'NOIR',text:'Mara’s ribbon led me beneath the city. These graves have dates, but someone scraped away every name.'},
    {speaker:'SERA',text:'The bell began when my coffin was still empty. It speaks with the dead because the living would know it lies.'},
    {speaker:'NOIR',text:'Then I will take a name out of this place. One is enough to prove they were here.'}
  ],after:'Sera Vale. You carry her name beyond the gate. A bell far below answers once.'},
  {tag:'02 · THE FOUNDRY',lines:[
    {speaker:'NOIR',text:'The furnaces are cold. The hammers still fall. The chains move when no one pulls them.'},
    {speaker:'EDA',text:'They melted our nameplates into bell tongues. A city without names could be told anything.'},
    {speaker:'NOIR',text:'There is a tongue hidden in the slag. Eda left us a way to make it speak differently.'}
  ],after:'The stolen tongue rings against the stone. For one breath, the machines lose their rhythm.'},
  {tag:'03 · THE FLOOD',lines:[
    {speaker:'TOVIN',text:'Count between the strokes. That was how we breathed while the water filled the lower ward.'},
    {speaker:'NOIR',text:'The floodgate was locked from the dry side.'},
    {speaker:'THE REGENT',text:'I saved the city above it. I have repeated that sentence until it almost sounds true.'}
  ],after:'The water recedes from a child’s message. It names the hand that closed the gate.'},
  {tag:'04 · THE ARCHIVES',lines:[
    {speaker:'ARCHIVIST',text:'Every map was amended. No streets erased; only the people who lived on them.'},
    {speaker:'NOIR',text:'The order bears Regent Ilyan’s seal. His own daughter is listed as the first offering.'},
    {speaker:'THE REGENT',text:'Elian was dying with the rest of us. I made a place where the moment before could last.'}
  ],after:'You fold the missing page. A city can hide a crime only while no one remembers its victims.'},
  {tag:'05 · THE BELFRY',lines:[
    {speaker:'ELIAN',text:'Father calls this my voice. I have been asking him to stop for years.'},
    {speaker:'NOIR',text:'Each toll steals a name. The bell is not warning the city; it is feeding on it.'},
    {speaker:'THE REGENT',text:'If it falls silent, I hear the moment she died. Do you understand what you ask of me?'}
  ],after:'The rope burns through your grip. In the pause after the toll, someone says Elian’s name.'},
  {tag:'06 · THE ORCHARD',lines:[
    {speaker:'NOIR',text:'White fruit grows from the graves. Every branch bends toward the sound of a name.'},
    {speaker:'MARA',text:'I followed you to the outer gate. I could not cross. I left my ribbon so you would know home still exists.'},
    {speaker:'NOIR',text:'I remember her hand. The bell has not taken that from me yet.'}
  ],after:'You leave the fruit untouched. The ribbon is real, and the way home has a cost.'},
  {tag:'07 · THE PRISON',lines:[
    {speaker:'WARDEN',text:'They jailed anyone who remembered the drowned. I held the keys until they took my son.'},
    {speaker:'NOIR',text:'One cell is open. The others have marks on the inside of their doors.'},
    {speaker:'WARDEN',text:'Take their testimony. Do not mistake a locked door for an empty room.'}
  ],after:'The last lock turns. The prisoners are gone, but their account of the flood remains.'},
  {tag:'08 · THE CHOIR',lines:[
    {speaker:'THE TEN',text:'We tried to speak together. He called our voices a hymn so no one would listen to the words.'},
    {speaker:'NOIR',text:'There is a silence after the final name. Even the bell cannot reach it.'},
    {speaker:'ELIAN',text:'Use that silence. It is the only thing my father did not build.'}
  ],after:'The voices stop at once. The silence they leave is heavy enough to open a door.'},
  {tag:'09 · THE ABYSS',lines:[
    {speaker:'YOUR REFLECTION',text:'You opened the gate once. When you heard Elian trapped inside, you ran. I stayed with the memory.'},
    {speaker:'NOIR',text:'I thought you were chasing me.'},
    {speaker:'YOUR REFLECTION',text:'I was waiting for you to be strong enough to come back. The moon above us is the bell’s open mouth.'}
  ],after:'You take back the memory of your flight. The false moon cracks, and the throne beneath it wakes.'},
  {tag:'10 · THE THRONE',lines:[
    {speaker:'THE REGENT',text:'One name will keep the door open. Yours, or theirs. I have spent years choosing for everyone.'},
    {speaker:'NOIR',text:'You did not preserve your daughter. You made the whole city die around her, one name at a time.'},
    {speaker:'ELIAN',text:'Say every witness aloud. Let the bell break. Father must live long enough to hear what he did.'},
    {speaker:'YOUR REFLECTION',text:'There are three ways through. I can only stand beside you for the one you remember.'}
  ],after:'The Regent lowers his hand. The choice he denied the city is yours.'}
];

export const ENDINGS = {
  lantern: {title:'The Last Lantern',tag:'ENDING I · THE GIVEN NAME',lines:[
    'You give the bell your name. The gates open; the surviving voices pass into a dawn you will never see.',
    'Mara waits at the threshold with your ribbon. She hears something move beyond the stone, but no voice answers.',
    'Years later, travellers find a small, steady light in the crypt. It shows the way out. No one knows whose name it burns.'
  ]},
  home: {title:'The Door for One',tag:'ENDING II · THE KEPT NAME',lines:[
    'You keep your name and cross alone. Mara lifts you into her arms. For a moment, the bell is too distant to hear.',
    'The city remains sealed. At night, you hear Tovin count the strokes in your sleep.',
    'Your reflection stands at the window. It does not accuse you. It waits for someone else to find the door.'
  ]},
  dawn: {title:'The Silence After',tag:'ENDING III · THE TEN WITNESSES',lines:[
    'You speak all ten witnesses into the silence. The bell cracks. Elian dies at last, and the Regent remembers every life he spent to delay it.',
    'The sealed city does not survive. Its people emerge into weather and time; some have no homes left to return to.',
    'Mara finds you among them. You know her scent but not her name. She sits beside you until morning, and neither of you asks the other to remember first.'
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
