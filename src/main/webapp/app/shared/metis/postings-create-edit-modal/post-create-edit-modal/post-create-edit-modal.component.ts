import { Component, OnChanges, OnInit } from '@angular/core';
import { PostingsCreateEditModalDirective } from 'app/shared/metis/postings-create-edit-modal/postings-create-edit-modal.directive';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Post } from 'app/entities/metis/post.model';
import { MetisService } from 'app/shared/metis/metis.service';
import { FormBuilder, Validators } from '@angular/forms';
import { Lecture } from 'app/entities/lecture.model';
import { Exercise } from 'app/entities/exercise.model';
import { Course } from 'app/entities/course.model';
import { CourseWideContext, PageType, PostingEditType } from 'app/shared/metis/metis.util';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { Router } from '@angular/router';

const TITLE_MAX_LENGTH = 200;
const DEBOUNCE_TIME_BEFORE_SIMILARITY_CHECK = 800;

export interface ContextSelectorOption {
    lecture?: Lecture;
    exercise?: Exercise;
    courseWideContext?: CourseWideContext;
}

@Component({
    selector: 'jhi-post-create-edit-modal',
    templateUrl: './post-create-edit-modal.component.html',
    styleUrls: ['../../metis.component.scss'],
})
export class PostCreateEditModalComponent extends PostingsCreateEditModalDirective<Post> implements OnInit, OnChanges {
    exercises?: Exercise[];
    lectures?: Lecture[];
    tags: string[];
    course: Course;
    pageType: PageType;
    isAtLeastTutorInCourse: boolean;
    isAtLeastInstructorInCourse: boolean;
    currentContextSelectorOption: ContextSelectorOption;
    similarPosts: Post[] = [];
    readonly CourseWideContext = CourseWideContext;
    readonly PageType = PageType;
    readonly EditType = PostingEditType;

    constructor(protected metisService: MetisService, protected modalService: NgbModal, protected formBuilder: FormBuilder, private router: Router) {
        super(metisService, modalService, formBuilder);
    }

    /**
     * on initialization: reset all input field of the modal, determine the post context;
     * subscribe to the form control changes of the context selector in order to show the Announcement info box on selection;
     * authorize the user by invoking the metis service
     */
    ngOnInit(): void {
        this.resetCurrentContextSelectorOption();
        super.ngOnInit();
        this.course = this.metisService.getCourse();
        this.lectures = this.course.lectures;
        this.exercises = this.course.exercises;
        this.formGroup.controls['context'].valueChanges.subscribe((context: ContextSelectorOption) => {
            this.currentContextSelectorOption = context;
        });
        this.isAtLeastTutorInCourse = this.metisService.metisUserIsAtLeastTutorInCourse();
        this.isAtLeastInstructorInCourse = this.metisService.metisUserIsAtLeastInstructorInCourse();
    }

    /**
     * on initialization: reset all input field of the modal, determine the post context;
     */
    ngOnChanges(): void {
        this.resetCurrentContextSelectorOption();
        super.ngOnChanges();
    }

    /**
     * resets the pageType, initialContext, post tags, post title, and post content
     */
    resetFormGroup(): void {
        this.pageType = this.metisService.getPageType();
        this.tags = this.posting?.tags ?? [];
        this.formGroup = this.formBuilder.group({
            // the pattern ensures that the title and content must include at least one non-whitespace character
            title: [this.posting.title, [Validators.required, Validators.maxLength(TITLE_MAX_LENGTH), Validators.pattern(/^(\n|.)*\S+(\n|.)*$/)]],
            content: [this.posting.content, [Validators.required, Validators.maxLength(this.maxContentLength), Validators.pattern(/^(\n|.)*\S+(\n|.)*$/)]],
            context: [this.currentContextSelectorOption, [Validators.required]],
        });
        // start new subscription to value changes of title for posts that are not announcements;
        // we only want to search for similar posts (and show the result of the duplication check) if a post is created, not on updates
        if (this.editType === this.EditType.CREATE && !(this.posting.courseWideContext === CourseWideContext.ANNOUNCEMENT)) {
            this.triggerPostSimilarityCheck();
        }
        this.similarPosts = [];
    }

    /**
     * invokes the metis service after setting the title and current date as creation date of the new answer post,
     * ends the process successfully by closing the modal and stopping the button's loading animation
     */
    createPosting(): void {
        this.setPostProperties(this.posting);
        this.metisService.createPost(this.posting).subscribe({
            next: (post: Post) => {
                this.isLoading = false;
                this.modalRef?.close();
                this.onCreate.emit(post);
            },
            error: () => {
                this.isLoading = false;
            },
        });
    }

    /**
     * invokes the metis service to get similar posts on changes of the formGroup, i.e. title or content
     */
    triggerPostSimilarityCheck(): void {
        this.formGroup
            .get('title')
            ?.valueChanges.pipe(debounceTime(DEBOUNCE_TIME_BEFORE_SIMILARITY_CHECK), distinctUntilChanged())
            .subscribe((title: string) => {
                const tempPost = new Post();
                this.setPostProperties(tempPost);
                // determine if title is provided
                if (title.length > 0) {
                    // if title input field is not empty, invoke metis service to get similar posts
                    this.metisService.getSimilarPosts(tempPost).subscribe((similarPosts: Post[]) => {
                        this.similarPosts = similarPosts;
                    });
                } else {
                    // if title input field is empty, set similar posts to empty array to not show the list
                    this.similarPosts = [];
                }
            });
    }

    /**
     * invokes the metis service after setting the title of the updated post
     * ends the process successfully by closing the modal and stopping the button's loading animation
     */
    updatePosting(): void {
        this.setPostProperties(this.posting);
        this.metisService.updatePost(this.posting).subscribe({
            next: () => {
                this.isLoading = false;
                this.modalRef?.close();
            },
            error: () => {
                this.isLoading = false;
            },
        });
    }

    /**
     * updates the title in accordance with the current use case (edit or create)
     */
    updateModalTitle(): void {
        if (this.editType === this.EditType.UPDATE) {
            this.modalTitle = 'artemisApp.metis.editPosting';
        } else if (this.editType === this.EditType.CREATE) {
            this.modalTitle = 'artemisApp.metis.createModalTitlePost';
        }
    }

    /**
     * required for distinguishing different select options for the context selector,
     * Angular needs to be able to identify the currently selected option
     */
    compareContextSelectorOptionFn(option1: ContextSelectorOption, option2: ContextSelectorOption): boolean {
        if (option1.exercise && option2.exercise) {
            return option1.exercise.id === option2.exercise.id;
        } else if (option1.lecture && option2.lecture) {
            return option1.lecture.id === option2.lecture.id;
        } else if (option1.courseWideContext && option2.courseWideContext) {
            return option1.courseWideContext === option2.courseWideContext;
        }
        return false;
    }

    private setPostProperties(post: Post): void {
        post.title = this.formGroup.get('title')?.value;
        post.tags = this.tags;
        post.content = this.formGroup.get('content')?.value;
        const currentContextSelectorOption: ContextSelectorOption = {
            exercise: undefined,
            lecture: undefined,
            courseWideContext: undefined,
            ...this.formGroup.get('context')?.value,
        };
        this.posting = {
            ...this.posting,
            ...currentContextSelectorOption,
        };
        if (currentContextSelectorOption.courseWideContext) {
            this.posting.course = { id: this.course.id, title: this.course.title };
        }
    }

    private resetCurrentContextSelectorOption(): void {
        this.currentContextSelectorOption = {
            lecture: this.posting.lecture,
            exercise: this.posting.exercise,
            courseWideContext: this.posting.courseWideContext,
        };
    }
}
