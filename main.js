class Dialog {
    constructor(id, name, messages) {
        this.id = id
        this.name = name
        this.messages = messages
    }
}

class Dialogs {
    constructor() {
        this.dialogs = JSON.parse(localStorage.getItem('dialogs')) || [
            { id: 0, name: 'Dialog', messages: [] }
        ]
        this.current = null
    }

    create(id, name, messages) {
        this.dialogs = this.dialogs.filter(dialog => dialog.messages.length > 0)

        const dialog = new Dialog(id, name, messages)

        this.dialogs.push(dialog)

        this.current = dialog

        return dialog
    }

    remove(id) {
        this.dialogs = this.dialogs.filter(dialog => dialog.id !== id)
    }

    clear() {
        this.dialogs = []

        this.current = null
    }

    save() {
        localStorage.setItem('dialogs', JSON.stringify(this.dialogs))
    }
}

class UI {
    constructor(model) {
        this.model = model
        this.allowed = true

        this.dialogs = {
            container: document.querySelector('#dialogs_container'),
            create: document.querySelector('#dialogs_create'),
            clear: document.querySelector('#dialogs_clear')
        }

        this.chat = {
            container: document.querySelector('#chat_container'),
            send: document.querySelector('#chat_send'),
            textarea: document.querySelector('#chat_textarea'),
            loading: document.querySelector('#chat_loading')
        }

        this.render = {
            dialogs: () => {
                const current = this.model.current

                this.dialogs.container.innerHTML = ''

                if (this.model.dialogs.length > 0) {
                    this.model.dialogs.forEach(dialog => {
                        const li = document.createElement('li')

                        const base = [
                            'text-white',
                            'transition',
                            'ease-in-out',
                            'delay-50',
                            'rounded-full',
                            'px-3.5',
                            'py-1.5',
                            'cursor-pointer'
                        ]
                        const active = ['bg-indigo-400/75', 'text-black/90']

                        li.classList.add(...base)

                        if (current && dialog.id === current.id) {
                            li.classList.add(...active)
                        }

                        li.textContent = dialog.name

                        li.addEventListener('click', () => {
                            this.model.current = dialog

                            document
                                .querySelectorAll(
                                    `${this.dialogs.container.tagName} li`
                                )
                                .forEach(item => {
                                    active.forEach(cls =>
                                        item.classList.remove(cls)
                                    )
                                })

                            li.classList.add(...active)

                            this.render.chat()
                        })

                        this.dialogs.container.append(li)
                    })
                }
            },
            chat: () => {
                const current = this.model.current

                this.chat.container.innerHTML = ''

                if (current) {
                    current.messages.forEach(message => {
                        const div = `
                            <div class="flex gap-7 items-start">
                              <img class="invert w-7 square" src="/${
                                  message.role === 'system'
                                      ? 'openai-logomark'
                                      : 'user'
                              }.svg" alt="">
                              <div class="flex flex-col gap-5 ${
                                  message.role === 'system'
                                      ? 'text-indigo-300'
                                      : 'text-white'
                              }">${message.content.replace(/\n/g, '<br>')}</div>
                            </div>
                        `

                        this.chat.container.innerHTML += div
                    })
                }
            },
            all: () => {
                this.render.dialogs()
                this.render.chat()
            }
        }

        this.chat.container.addEventListener('click', event => {
            const button = event.target.closest('button[data-code]')

            if (button) {
                this.copyCode(button)
            }
        })

        this.dialogs.create.addEventListener('click', () => {
            const id = Math.round(Math.random() * 55555)
            const name = `Dialog | ${id}`
            const messages = []

            this.model.create(id, name, messages)
            this.model.save()

            this.render.dialogs()
            this.render.chat()

            this.chat.textarea.focus()
        })

        this.dialogs.clear.addEventListener('click', () => {
            this.model.clear()
            this.model.save()

            this.render.dialogs()
            this.render.chat()
        })

        this.chat.send.addEventListener('click', () => {
            this.send()
        })

        this.chat.textarea.addEventListener('keydown', event => {
            if (event.code === 'Enter') {
                event.preventDefault()

                this.send()
            }
        })

        this.chat.textarea.addEventListener('input', event => {
            if (event.target.scrollHeight > 200) {
                event.target.style.overflow = 'auto'
                event.target.style.height = '200px'

                event.target.classList.add('scrollable')
            } else {
                event.target.style.height = 'auto'
                event.target.style.height = event.target.scrollHeight + 'px'
                event.target.style.overflow = 'hidden'
            }
        })

        this.chat.textarea.addEventListener('blur', event => {
            event.target.style.height = 'auto'
        })
    }

    async send() {
        if (this.allowed) {
            this.allowed = false

            this.chat.loading.classList.add('opacity-50')

            const textarea = this.chat.textarea
            const content = textarea.value.trim()

            textarea.value = ''

            if (content) {
                let dialog

                if (this.model.current) {
                    dialog = this.model.dialogs.find(
                        dialog => dialog.id === this.model.current.id
                    )
                } else {
                    const id = Math.round(Math.random() * 55555)
                    const name = `from chat | ${id}`
                    const messages = []

                    dialog = this.model.create(id, name, messages)
                }

                dialog.messages.push({ role: 'user', content })

                const response = await this.interact(
                    this.model.current.messages
                )

                const data = await response.json()

                dialog.messages.push({
                    role: 'system',
                    content: this.handle(data.choices[0].message.content)
                })

                this.model.save()

                this.render.chat()
                this.render.dialogs()
            }

            this.chat.loading.classList.remove('opacity-50')

            this.allowed = true
        }
    }

    async interact(messages) {
        const url = 'https://api.openai.com/v1/chat/completions'
        const key = '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'

        const response = await fetch(url, {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${key}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages
            })
        })

        return response
    }

    handle(content) {
        const pattern = /```(\w+)([\s\S]+?)```/g
        const matches = [...content.matchAll(pattern)]

        if (!matches.length) return content

        matches.forEach(match => {
            const language = match[1]
            const code = match[2].trim()

            const replacement = `<div class="rounded-md overflow-auto"><div class="flex justify-between items-center bg-white/10 px-5 py-2.5"><span class="text-white text-xs">${language}</span><button class="text-white text-xs" data-code="${this.escapeHtml(
                code
            )}">Copy code</button></div><pre class="p-5 text-white bg-black/80"><code>${code}</code></pre></div>`

            content = content.replace(match[0], replacement)
        })

        return content
    }

    async copyCode(buttonElement) {
        const code = buttonElement.getAttribute('data-code')

        try {
            await navigator.clipboard.writeText(code)
            buttonElement.innerText = 'Copied'

            setTimeout(() => {
                buttonElement.innerText = 'Copy code'
            }, 2000)
        } catch (err) {
            console.error('Error', err)
        }
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }
        return text.replace(/[&<>"']/g, function (m) {
            return map[m]
        })
    }
}

const model = new Dialogs()
const view = new UI(model)

view.render.all()
