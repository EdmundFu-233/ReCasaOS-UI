<template>
	<div class="modal-card share-access-modal">
		<header class="modal-card-head">
			<h3 class="title is-header">
				{{ isNew ? $t('Share this folder') : $t('Who can open this folder') }}
			</h3>
		</header>

		<section class="modal-card-body">
			<p class="has-text-full-03 is-size-7 mb-4">
				{{ share.path }}
			</p>

			<b-message v-if="error" class="mb-4" size="is-small" type="is-danger">
				{{ error }}
			</b-message>

			<b-switch v-model="restrict">
				{{ $t('Only one account') }}
			</b-switch>

			<p v-if="!restrict" class="has-text-full-03 is-size-7 mt-2">
				{{ $t('Every share account can open this folder.') }}
			</p>

			<b-field v-else class="mt-3">
				<b-select v-model="username" :placeholder="$t('Choose an account')" expanded>
					<option v-for="user in users" :key="user" :value="user">
						{{ user }}
					</option>
				</b-select>
			</b-field>

			<p class="has-text-full-03 is-size-7 mt-3">
				<a href="#" @click.prevent="manageUsers">{{ $t('Manage share accounts') }}</a>
			</p>

			<p v-if="restrict" class="has-text-full-03 is-size-7 mt-4">
				{{ $t('The folder is handed to the account; files already in it keep their current permissions.') }}
			</p>
		</section>

		<footer class="modal-card-foot is-flex is-align-items-center">
			<div class="is-flex-grow-1"></div>
			<div>
				<b-button :label="$t('Cancel')" rounded @click="$emit('close')" />
				<b-button :disabled="!canSave" :label="isNew ? $t('Share') : $t('Save')" :loading="isSaving" rounded
					type="is-primary" @click="save" />
			</div>
		</footer>
	</div>
</template>

<script>
// adapted from ReCasaOS/CasaOS-UI; shares always authenticated → "any share account" or "only this one"
import SambaUsersModal from './SambaUsersModal.vue'

export default {
	name: 'ShareAccessModal',
	props: {
		// { path } to share a folder; { id, path } to change an existing share
		share: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			restrict: false,
			username: '',
			current: '',
			users: [],
			isSaving: false,
			error: '',
		}
	},
	computed: {
		isNew() {
			return !this.share.id
		},
		canSave() {
			if (this.isSaving || (this.restrict && !this.username)) {
				return false
			}
			return this.isNew || (this.restrict ? this.username : '') !== this.current
		},
	},
	created() {
		this.loadUsers()
		if (!this.isNew) {
			this.loadCurrent()
		}
	},
	methods: {
		messageOf(e) {
			return (e && e.response && e.response.data && e.response.data.message) || this.$t('Something went wrong.')
		},

		async loadUsers() {
			try {
				const response = await this.$api.samba.getUsers()
				this.users = response.data.data || []
			} catch (e) {
				this.users = []
			}
		},

		// file item lacks the share's account → read back
		async loadCurrent() {
			try {
				const response = await this.$api.samba.getShares()
				const share = (response.data.data || []).find(item => String(item.id) === String(this.share.id))
				this.current = (share && share.username) || ''
				this.restrict = this.current !== ''
				this.username = this.current
			} catch (e) {
				this.error = this.messageOf(e)
			}
		},

		manageUsers() {
			this.$buefy.modal.open({
				parent: this,
				component: SambaUsersModal,
				hasModalCard: true,
				trapFocus: true,
				canCancel: ['escape'],
				scroll: 'keep',
				animation: 'zoom-in',
				events: { close: () => this.loadUsers() },
			})
		},

		async save() {
			if (!this.canSave) {
				return
			}
			this.isSaving = true
			this.error = ''
			const username = this.restrict ? this.username : ''
			try {
				if (this.isNew) {
					await this.$api.samba.createShare([{ path: this.share.path, anonymous: false, username }])
				} else {
					await this.$api.samba.updateShare(this.share.id, { username })
				}
				this.$emit('reload')
				this.$emit('close')
			} catch (e) {
				this.error = this.messageOf(e)
			} finally {
				this.isSaving = false
			}
		},
	},
}
</script>

<style lang="scss" scoped>
.share-access-modal {
	.modal-card-body {
		min-height: 12rem;
	}
}
</style>
