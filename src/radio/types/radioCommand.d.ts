import type { RadioCode } from './radioCode'

interface RadioBaseCommand<TCode extends RadioCode, TData = object> {
  offset: number
  code: TCode
  data: TData
  responsible: RadioCommand[]
  size: number
}

type RadioCommand
  = | RadioAddContactCommand
    | RadioAnimCommand
    | RadioAudioCommand
    | RadioElseCommand
    | RadioElseIfCommand
    | RadioEndlineCommand
    | RadioEvalCommand
    | RadioIfCommand
    | RadioMemSaveCommand
    | RadioNullCommand
    | RadioPromptCommand
    | RadioSaveCommand
    | RadioScriptCommand
    | RadioSubtitleCommand
    | RadioIfSwitchCommand
    | RadioIfSwitchOpCommand
    | RadioVoiceCommand

interface RadioAddContactCommand extends RadioBaseCommand<RadioCode.ADD_CONTACT, {
  freq: number
  text: string
}> {}

interface RadioAnimCommand extends RadioBaseCommand<RadioCode.ANIM, {
  actor: string
  face: string
  unk0: string
}> {}

interface RadioAudioCommand extends RadioBaseCommand<RadioCode.AUDIO, {
  unk0: string
  unk1: string
  unk2: string
}> {}

interface RadioIfCommand extends RadioBaseCommand<RadioCode.IF, {
  expression?: string
}> {}

interface RadioElseIfCommand extends RadioBaseCommand<RadioCode.ELSE_IF, {
  expression?: string
}> {}

interface RadioElseCommand extends RadioBaseCommand<RadioCode.ELSE> {}

interface RadioEndlineCommand extends RadioBaseCommand<RadioCode.ENDLINE> {}

interface RadioEvalCommand extends RadioBaseCommand<RadioCode.EVAL, {
  unk0: string
}> {}

interface RadioMemSaveCommand extends RadioBaseCommand<RadioCode.MEM_SAVE, {
  unk0: string
}> {}

interface RadioNullCommand extends RadioBaseCommand<RadioCode.NULL> {}

interface RadioPromptCommand extends RadioBaseCommand<RadioCode.PROMPT, {
  params: string[]
}> {}

interface RadioSaveCommand extends RadioBaseCommand<RadioCode.SAVE, {
  unk0: string
}> {}

interface RadioScriptCommand extends RadioBaseCommand<RadioCode.SCRIPT> {
  // i merged to container object but can be handle seperated.
}

interface RadioSubtitleCommand extends RadioBaseCommand<RadioCode.SUBTITLE, {
  actor: string
  face: string
  unk0: string
  text: string
}> {}

interface RadioIfSwitchCommand extends RadioBaseCommand<RadioCode.SWITCH, {
  value: number
}> {}

interface RadioIfSwitchOpCommand extends RadioBaseCommand<RadioCode.SWITCH_OP, {
  value: number
}> {}

interface RadioVoiceCommand extends RadioBaseCommand<RadioCode.VOICE, {
  unk0: string
  unk1: string
}> {}
